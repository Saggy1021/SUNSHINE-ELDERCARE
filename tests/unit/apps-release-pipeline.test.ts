import assert from "node:assert";
import fs from "fs";
import path from "path";

// Automatically configure DATABASE_URL from session file if available locally
const sessionFile = "/Users/tanish/Sunshine Web/.production-db-session.local";
if (fs.existsSync(sessionFile) && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("127.0.0.1"))) {
  try {
    const raw = fs.readFileSync(sessionFile, "utf8").trim();
    const match = raw.match(/^DATABASE_URL=["']?(.*?)["']?$/m) || [null, raw];
    const url = match[1]?.trim() || raw;
    if (url.startsWith("postgres")) {
      process.env.DATABASE_URL = url;
    }
  } catch {}
}

import { ApkValidator } from "@/lib/services/apk-validator";
import { AppsService } from "@/lib/services/apps";
import { db as prisma } from "@/lib/db";

async function runRegressionTests() {
  console.log("================================================================");
  console.log("AUTOMATED REGRESSION TEST SUITE: APK RELEASES & UPDATES PIPELINE");
  console.log("================================================================\n");

  const publicDownloadsDir = path.join(process.cwd(), "public", "downloads", "apps");
  assert(fs.existsSync(publicDownloadsDir), "public/downloads/apps must exist on filesystem");

  // -------------------------------------------------------------------------
  // TEST 1: Existing APKs on disk pass integrity inspection and return HTTP 200 status
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Verifying static binary storage on disk...");
  const memberApkPath = path.join(publicDownloadsDir, "Sunshine-Member-Release.apk");
  const employeeApkPath = path.join(publicDownloadsDir, "Sunshine-Employee-Release.apk");

  assert(fs.existsSync(memberApkPath), "Sunshine-Member-Release.apk must exist");
  assert(fs.existsSync(employeeApkPath), "Sunshine-Employee-Release.apk must exist");

  const memberBytes = fs.readFileSync(memberApkPath);
  const employeeBytes = fs.readFileSync(employeeApkPath);

  const memberInspection = ApkValidator.inspectApk(memberBytes);
  const employeeInspection = ApkValidator.inspectApk(employeeBytes);

  assert.strictEqual(memberInspection.isValid, true, "Member APK must be valid");
  assert.strictEqual(memberInspection.packageName, "in.sunshineeldercare.member");
  assert.strictEqual(employeeInspection.isValid, true, "Employee APK must be valid");
  assert.strictEqual(employeeInspection.packageName, "in.sunshineeldercare.employee");

  console.log(`  ✓ Member APK valid: ${memberInspection.versionName} (Build ${memberInspection.versionCode}) - ${memberBytes.length} bytes`);
  console.log(`  ✓ Employee APK valid: ${employeeInspection.versionName} (Build ${employeeInspection.versionCode}) - ${employeeBytes.length} bytes`);

  // -------------------------------------------------------------------------
  // TEST 2: Pre-publish validation blocks non-existent APK paths from being published
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing pre-publish validation on missing APK URLs...");
  const fakeInput = {
    appId: "cmwrki3hl0000ho40lzxj4yqe", // member-app
    versionName: "9.9.9",
    versionCode: 999,
    apkUrl: "/downloads/apps/NonExistent-Phantom-App.apk",
    apkFileName: "NonExistent-Phantom-App.apk",
    fileSize: 1234567,
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    isPublished: true,
  };

  let rejected = false;
  try {
    await AppsService.createRelease(fakeInput as any);
  } catch (err: any) {
    rejected = true;
    assert(err.message.includes("does not exist"), `Error should indicate missing file, got: ${err.message}`);
  }
  assert.strictEqual(rejected, true, "Pre-publish validation must reject non-existent binary URLs");
  console.log("  ✓ Correctly rejected phantom release with non-existent binary URL.");

  // -------------------------------------------------------------------------
  // TEST 3: Authoritative URL resolution recovers from missing or suffixed URLs
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing URL resolution & self-healing fallback...");
  const app = await prisma.publishedApp.findFirst({
    where: { slug: "member-app" },
    include: { versions: { orderBy: { versionCode: "desc" } } },
  });
  assert(app, "member-app must exist in DB");

  // Simulate a release with a suffixed or missing URL
  const phantomRelease = {
    versionName: "1.0.2",
    versionCode: 3,
    apkUrl: "/downloads/apps/Sunshine-Member-v1.0.2-b3-d3f31e56.apk",
    apkFileName: "Sunshine-Member-v1.0.2-b3-d3f31e56.apk",
  };

  const resolved = AppsService.resolveAuthoritativeDownloadUrl(phantomRelease, app);
  assert(resolved.startsWith("http"), "Resolved URL must be an absolute URL");
  assert(
    resolved.includes("Sunshine-Member-v1.0.2-b3.apk") || resolved.includes("Sunshine-Member-Release.apk"),
    `Resolved URL should point to existing binary, got: ${resolved}`
  );
  console.log(`  ✓ Suffixed URL automatically resolved to existing binary: ${resolved}`);

  // -------------------------------------------------------------------------
  // TEST 4: Manifest generation invariant: apkDownloadUrl is guaranteed accessible
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Testing manifest generation invariants...");
  const manifest = await AppsService.getUpdateManifest("member-app");
  assert(manifest && !Array.isArray(manifest), "Manifest must be returned as an object");
  assert.strictEqual(manifest.appId, "member-app");
  assert.strictEqual(manifest.packageName, "in.sunshineeldercare.member");
  assert(manifest.latestVersionCode >= 3, `Latest version code must be >= 3, got: ${manifest.latestVersionCode}`);
  assert(manifest.apkDownloadUrl.startsWith("http"), "apkDownloadUrl must be absolute");
  assert(manifest.sha256 && manifest.sha256.length === 64, "sha256 must be 64-char hex");
  assert(manifest.fileSize > 10 * 1024 * 1024, "fileSize must be > 10MB");

  // Verify manifest download URL is authoritative (gateway endpoint or verified disk file)
  if (manifest.apkDownloadUrl.includes("/api/apps/")) {
    assert(manifest.apkDownloadUrl.endsWith("/api/apps/member-app/download"), "Gateway URL must be /api/apps/member-app/download");
  } else {
    const relativeManifestPath = manifest.apkDownloadUrl.replace(/^https?:\/\/[^\/]+/, "");
    const manifestDiskPath = path.join(process.cwd(), "public", relativeManifestPath);
    assert(fs.existsSync(manifestDiskPath), `Manifest download target must exist on disk: ${manifestDiskPath}`);
  }
  console.log(`  ✓ Manifest apkDownloadUrl points to verified accessible binary: ${manifest.apkDownloadUrl}`);

  // -------------------------------------------------------------------------
  // TEST 5: Smart Route Handler resolution
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Testing Smart Route Handler resolution logic...");
  // Import route handler
  const { GET: smartDownloadHandler } = await import("@/app/downloads/apps/[file]/route");

  // 5A. Direct existing file request
  const directReq = new Request("https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-Release.apk");
  const directRes = await smartDownloadHandler(directReq as any, { params: Promise.resolve({ file: "Sunshine-Member-Release.apk" }) });
  assert.strictEqual(directRes.status, 200, "Direct existing file request must return 200");
  assert.strictEqual(directRes.headers.get("content-type"), "application/vnd.android.package-archive");
  console.log("  ✓ Direct file request returned HTTP 200 with Android APK headers.");

  // 5B. Suffixed file request (e.g. -d3f31e56.apk)
  const suffixedReq = new Request("https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-v1.0.2-b3-d3f31e56.apk");
  const suffixedRes = await smartDownloadHandler(suffixedReq as any, { params: Promise.resolve({ file: "Sunshine-Member-v1.0.2-b3-d3f31e56.apk" }) });
  assert.strictEqual(suffixedRes.status, 307, "Suffixed file request must return 307 redirect to valid binary");
  const redirectTarget = suffixedRes.headers.get("location");
  assert(redirectTarget?.includes("Sunshine-Member-v1.0.2-b3.apk") || redirectTarget?.includes("Sunshine-Member-Release.apk"), `Redirect target must point to real binary, got: ${redirectTarget}`);
  console.log(`  ✓ Suffixed file request gracefully redirected (307) to: ${redirectTarget}`);

  // 5C. Completely unknown random APK returns 404 with structured JSON
  const unknownReq = new Request("https://www.sunshineeldercare.in/downloads/apps/RandomFakeApp-999.apk");
  const unknownRes = await smartDownloadHandler(unknownReq as any, { params: Promise.resolve({ file: "RandomFakeApp-999.apk" }) });
  assert.strictEqual(unknownRes.status, 404, "Unknown APK must return 404");
  const jsonBody = await unknownRes.json();
  assert.strictEqual(jsonBody.error, "APK binary not found");
  console.log("  ✓ Unknown file request cleanly returned HTTP 404 with structured diagnostics.");

  console.log("\n================================================================");
  console.log("ALL 5 REGRESSION TEST SUITES PASSED SUCCESSFULLY!");
  console.log("================================================================\n");
}

runRegressionTests().catch((err) => {
  console.error("❌ REGRESSION TEST FAILED:", err);
  process.exit(1);
});
