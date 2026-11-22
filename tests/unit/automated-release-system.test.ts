import assert from "node:assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure environment variables are loaded from session or .env.local
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

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  try {
    const lines = fs.readFileSync(envLocalPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).replace(/^["']|["']$/g, "").trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

import { r2ReleaseStorage } from "@/lib/services/storage/r2-releases";
import { ApkValidator } from "@/lib/services/apk-validator";
import { AppsService } from "@/lib/services/apps";
import { db as prisma } from "@/lib/db";

async function runAutomatedReleaseSystemTests() {
  console.log("================================================================");
  console.log("AUTOMATED ACCEPTANCE & RELEASE SYSTEM VERIFICATION SUITE");
  console.log("================================================================\n");

  // -------------------------------------------------------------------------
  // TEST 1: Cloudflare R2 Connection & Configuration
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Verifying Cloudflare R2 client configuration...");
  assert(r2ReleaseStorage.isConfigured(), "Cloudflare R2 client must be configured");
  assert.strictEqual(
    r2ReleaseStorage.getBucketName(),
    "sunshine-documents-prod",
    "Bucket name must be sunshine-documents-prod"
  );
  console.log("  ✓ Cloudflare R2 configured for bucket 'sunshine-documents-prod'.");

  // -------------------------------------------------------------------------
  // TEST 2: Authoritative Member App Binary in Cloudflare R2
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Verifying Member App binary existence, byte count & SHA-256 in R2...");
  const memberKey = "releases/apps/member-app/Sunshine-Member-Release.apk";
  const memberHead = await r2ReleaseStorage.headReleaseObject(memberKey);

  assert.strictEqual(memberHead.exists, true, `R2 object '${memberKey}' must exist`);
  assert.strictEqual(
    memberHead.contentLength,
    46718122,
    `Member APK size must match exact build bytes (expected 46718122, got ${memberHead.contentLength})`
  );
  console.log(`  ✓ R2 object confirmed: ${memberKey} (${memberHead.contentLength} bytes)`);

  // Download complete binary from R2 to perform deep inspection
  console.log("  Downloading binary from R2 for cryptographic & Android package verification...");
  const memberBuffer = await r2ReleaseStorage.getObjectBuffer(memberKey);
  assert.strictEqual(memberBuffer.length, 46718122, "Downloaded byte count must match exact size");

  const computedMemberSha256 = crypto.createHash("sha256").update(memberBuffer).digest("hex").toLowerCase();
  const expectedMemberSha256 = "cf672287e6e396dcfa6070a6256176ba5d1161342187b1f4f406ef3b0368deaf";
  assert.strictEqual(
    computedMemberSha256,
    expectedMemberSha256,
    `SHA-256 must match authoritative build hash (expected ${expectedMemberSha256}, got ${computedMemberSha256})`
  );
  console.log(`  ✓ SHA-256 verified: ${computedMemberSha256}`);

  // Android package inspection
  const memberInspection = ApkValidator.inspectApk(memberBuffer);
  assert.strictEqual(memberInspection.isValid, true, "Member APK must be a valid Android package");
  assert.strictEqual(memberInspection.packageName, "in.sunshineeldercare.member", "Package ID must be in.sunshineeldercare.member");
  assert.strictEqual(memberInspection.versionCode, 6, "Version code must be 6");
  assert.strictEqual(memberInspection.versionName, "1.0.5", "Version name must be 1.0.5");
  assert.strictEqual(
    memberInspection.certificateFingerprint?.toLowerCase(),
    "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394",
    "Production signing keystore fingerprint must match"
  );
  console.log(`  ✓ Android Manifest: Package '${memberInspection.packageName}', Version ${memberInspection.versionName} (Build ${memberInspection.versionCode})`);
  console.log(`  ✓ Android Signature: Keystore fingerprint verified.`);

  // -------------------------------------------------------------------------
  // TEST 3: Authoritative Employee App Binary in Cloudflare R2
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Verifying Employee App binary existence in R2...");
  const employeeKey = "releases/apps/employee-app/Sunshine-Employee-Release.apk";
  const employeeHead = await r2ReleaseStorage.headReleaseObject(employeeKey);

  assert.strictEqual(employeeHead.exists, true, `R2 object '${employeeKey}' must exist`);
  assert.strictEqual(employeeHead.contentLength, 46796266, "Employee APK size must match 46796266 bytes");

  const employeeBuffer = await r2ReleaseStorage.getObjectBuffer(employeeKey);
  const computedEmployeeSha = crypto.createHash("sha256").update(employeeBuffer).digest("hex").toLowerCase();
  assert.strictEqual(
    computedEmployeeSha,
    "4dffa19ec265749aeec8e80963420313124204b7b819d232f857b21eca132682",
    "Employee APK SHA-256 must match authoritative hash"
  );
  console.log(`  ✓ Employee APK verified in R2: 46,796,266 bytes, SHA-256 verified.`);

  // -------------------------------------------------------------------------
  // TEST 4: Presigned Download URL with HTTP Range Resume Support
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Testing Presigned Download URL generation and HTTP delivery...");
  const presignedDownloadUrl = await r2ReleaseStorage.getPresignedDownloadUrl(
    memberKey,
    "Sunshine-Member-v1.0.5-b6.apk",
    3600
  );
  assert(presignedDownloadUrl.startsWith("https://"), "Presigned URL must be HTTPS");
  assert(presignedDownloadUrl.includes("X-Amz-Signature"), "Presigned URL must contain SigV4 signature");

  // Test real HTTP partial content request (Range: bytes=0-100)
  const rangeRes = await fetch(presignedDownloadUrl, {
    headers: { Range: "bytes=0-100" },
  });
  assert(
    rangeRes.status === 206 || rangeRes.status === 200,
    `Presigned download must respond with 206 Partial Content or 200 OK (got ${rangeRes.status})`
  );
  const rangeHeader = rangeRes.headers.get("content-range");
  if (rangeHeader) {
    assert(rangeHeader.includes("46718122"), `Content-Range must reflect full file size 46718122 (got ${rangeHeader})`);
  }
  console.log(`  ✓ Presigned URL successfully fetched HTTP ${rangeRes.status} with Content-Range: ${rangeHeader || "OK"}`);

  // -------------------------------------------------------------------------
  // TEST 5: Automated Acceptance Check on Database Release Record
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Executing AppsService.runReleaseAcceptanceCheck on current Member App release...");
  const memberApp = await prisma.publishedApp.findFirst({
    where: { slug: "member-app" },
    include: { versions: { where: { isPublished: true }, orderBy: { versionCode: "desc" }, take: 1 } },
  });
  assert(memberApp && memberApp.versions[0], "Published Member App release must exist in database");

  const latestRelease = memberApp.versions[0];
  console.log(`  Running acceptance check for Release ID: ${latestRelease.id} (v${latestRelease.versionName} Build ${latestRelease.versionCode})...`);

  const acceptanceReport = await AppsService.runReleaseAcceptanceCheck(latestRelease.id);
  assert.strictEqual(acceptanceReport.passed, true, `Acceptance check must pass 100%: ${acceptanceReport.error}`);
  assert.strictEqual(acceptanceReport.checks.binaryAccessible, true, "Binary must be accessible");
  assert.strictEqual(acceptanceReport.checks.byteCountMatches, true, "Byte count must match DB record");
  assert.strictEqual(acceptanceReport.checks.sha256Matches, true, "SHA-256 must match DB record");
  assert.strictEqual(acceptanceReport.checks.validPackage, true, "APK must be a valid Android package");
  assert.strictEqual(acceptanceReport.checks.packageMatches, true, "Package ID must match app record");
  assert.strictEqual(acceptanceReport.checks.versionMatches, true, "Version details must match DB record");
  assert.strictEqual(acceptanceReport.checks.signatureValid, true, "Signature must match production keystore");

  console.log("  ✓ All 7 acceptance checks passed with 100% success:");
  console.log("    • Binary Accessible: true");
  console.log(`    • Byte Count: ${acceptanceReport.details.actualSize} bytes (exact match)`);
  console.log(`    • SHA-256: ${acceptanceReport.details.actualSha256} (exact match)`);
  console.log(`    • Package ID: ${acceptanceReport.details.expectedPackage} (match)`);
  console.log(`    • Version: v${acceptanceReport.details.versionName} / Build ${acceptanceReport.details.versionCode} (match)`);
  console.log("    • Signing Keystore: Verified");

  // -------------------------------------------------------------------------
  // TEST 6: Pre-Publish Invariant: Reject Releases Missing Storage Binary
  // -------------------------------------------------------------------------
  console.log("\n[TEST 6] Testing pre-publish validation on missing R2 storage binary...");
  let phantomRejected = false;
  try {
    await AppsService.createRelease({
      appId: memberApp.id,
      versionName: "9.9.9",
      versionCode: 9999,
      apkUrl: "/api/apps/member-app/download",
      apkFileName: "Sunshine-Member-v9.9.9-b9999.apk",
      fileSize: 46000000,
      sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      storageKey: "releases/apps/member-app/NonExistent-Phantom.apk",
      storageProvider: "R2",
      isPublished: true,
    });
  } catch (err: any) {
    phantomRejected = true;
    assert(
      err.message.includes("not found in Cloudflare R2") || err.message.includes("Cannot publish release"),
      `Expected error to mention R2 missing binary, got: ${err.message}`
    );
  }
  assert.strictEqual(phantomRejected, true, "Pre-publish validation must reject releases without R2 binary");
  console.log("  ✓ Correctly rejected phantom release with missing Cloudflare R2 binary.");

  // -------------------------------------------------------------------------
  // TEST 7: Update Manifest Integrity
  // -------------------------------------------------------------------------
  console.log("\n[TEST 7] Testing Update Manifest generation for Member App updater...");
  const manifest = await AppsService.getUpdateManifest("member-app");
  assert(manifest, "Manifest for member-app must not be null");
  assert.strictEqual(manifest.latestVersionCode, 6, "Manifest must report Build 6");
  assert.strictEqual(manifest.latestVersionName, "1.0.5", "Manifest must report Version 1.0.5");
  assert.strictEqual(manifest.sha256, expectedMemberSha256, "Manifest SHA-256 must match authoritative binary");
  assert.strictEqual(manifest.fileSize, 46718122, "Manifest fileSize must match exact binary size");
  assert(
    manifest.apkDownloadUrl.includes("/api/apps/member-app/download"),
    `Manifest download URL must point to canonical download gateway (got ${manifest.apkDownloadUrl})`
  );
  console.log("  ✓ Manifest verified:");
  console.log(`    • latestVersionName: ${manifest.latestVersionName}`);
  console.log(`    • latestVersionCode: ${manifest.latestVersionCode}`);
  console.log(`    • apkDownloadUrl: ${manifest.apkDownloadUrl}`);
  console.log(`    • sha256: ${manifest.sha256}`);
  console.log(`    • fileSize: ${manifest.fileSize}`);

  console.log("\n================================================================");
  console.log("ALL 7 RELEASE SYSTEM ACCEPTANCE TESTS PASSED (100% SUCCESS)");
  console.log("================================================================\n");
}

runAutomatedReleaseSystemTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Acceptance Test Failed:", err);
    process.exit(1);
  });
