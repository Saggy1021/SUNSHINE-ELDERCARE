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
import { ReleasePublishingService } from "@/lib/services/apps/publisher";
import { db as prisma } from "@/lib/db";

async function runComprehensiveReleaseSystemTests() {
  console.log("================================================================");
  console.log("SUNSHINE ELDERCARE — PERMANENT RELEASE AUTOMATION TEST SUITE");
  console.log("================================================================\n");

  const expectedMemberSha256 = "cf672287e6e396dcfa6070a6256176ba5d1161342187b1f4f406ef3b0368deaf";
  const expectedFileSize = 46718122;
  const canonicalMemberKey = "releases/apps/member-app/Sunshine-Member-v1.0.5-b6-cf672287.apk";

  // -------------------------------------------------------------------------
  // TEST 1: Correct APK Upload & Inspection
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Correct APK Upload & Inspection...");
  const memberBuffer = await r2ReleaseStorage.getObjectBuffer(canonicalMemberKey);
  assert.strictEqual(memberBuffer.length, expectedFileSize, "Buffer length must match expected size");

  const inspectResult = ApkValidator.inspectApk(memberBuffer);
  assert.strictEqual(inspectResult.isValid, true, "APK inspection must succeed");
  assert.strictEqual(inspectResult.packageName, "in.sunshineeldercare.member", "Package ID must match");
  assert.strictEqual(inspectResult.versionCode, 6, "Version code must be 6");
  assert.strictEqual(inspectResult.versionName, "1.0.5", "Version name must be 1.0.5");
  console.log("  ✓ Correct APK inspection verified.");

  // -------------------------------------------------------------------------
  // TEST 2: Invalid Package ID Rejection
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Invalid Package ID Rejection...");
  let pkgRejected = false;
  try {
    // Attempt to publish member APK to employee app
    await ReleasePublishingService.publishFromBuffer(memberBuffer, {
      appSlug: "employee-app",
      isPublished: false,
    });
  } catch (err: any) {
    pkgRejected = true;
    assert(err.message.includes("Package ID mismatch"), `Expected package error, got: ${err.message}`);
  }
  assert.strictEqual(pkgRejected, true, "Publishing service must reject mismatched package ID");
  console.log("  ✓ Invalid Package ID correctly rejected.");

  // -------------------------------------------------------------------------
  // TEST 3: Invalid Signing Certificate Rejection
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Invalid Signing Certificate Rejection...");
  const fakeCertValidation = ApkValidator.verifyApkUpdate(
    {
      packageName: "in.sunshineeldercare.member",
      latestCertFingerprint: "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394",
      latestVersionCode: 5,
    },
    {
      isValid: true,
      fileSize: 46000000,
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      packageName: "in.sunshineeldercare.member",
      versionName: "1.0.6",
      versionCode: 7,
      certificateFingerprint: "bad_certificate_fingerprint_00000000000000000000000000000000000",
    }
  );
  assert.strictEqual(fakeCertValidation.valid, false, "Must reject mismatched certificate fingerprint");
  assert(
    fakeCertValidation.reason?.toLowerCase().includes("mismatch") &&
    fakeCertValidation.reason?.toLowerCase().includes("certificate"),
    `Reason must specify certificate mismatch, got: ${fakeCertValidation.reason}`
  );
  console.log("  ✓ Unauthorized signing certificate rejected.");

  // -------------------------------------------------------------------------
  // TEST 4: Lower / Equal Version Code Advisory & Invariance
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Lower / Equal Version Code Advisory Check...");
  const lowerVersionValidation = ApkValidator.verifyApkUpdate(
    {
      packageName: "in.sunshineeldercare.member",
      latestCertFingerprint: "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394",
      latestVersionCode: 6,
    },
    {
      isValid: true,
      fileSize: 46000000,
      sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      packageName: "in.sunshineeldercare.member",
      versionName: "1.0.4",
      versionCode: 5,
      certificateFingerprint: "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394",
    }
  );
  assert.strictEqual(lowerVersionValidation.hasCompatibilityWarning, true, "Must flag compatibility warning");
  console.log("  ✓ Lower version code accurately flagged.");

  // -------------------------------------------------------------------------
  // TEST 5: Corrupted Binary Rejection
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Corrupted Binary Rejection...");
  const corruptedBuffer = Buffer.from("PK\x03\x04CORRUPTED_NON_APK_DATA_STREAM");
  const corruptedInspect = ApkValidator.inspectApk(corruptedBuffer);
  assert.strictEqual(corruptedInspect.isValid, false, "Corrupted buffer must be rejected");
  console.log("  ✓ Corrupted buffer rejected.");

  // -------------------------------------------------------------------------
  // TEST 6: Interrupted / Missing Upload Handling
  // -------------------------------------------------------------------------
  console.log("\n[TEST 6] Interrupted / Missing Upload Handling...");
  let phantomRejected = false;
  try {
    await ReleasePublishingService.publishFromR2Storage({
      appSlug: "member-app",
      storageKey: "releases/apps/member-app/non-existent-phantom-object.apk",
    });
  } catch (err: any) {
    phantomRejected = true;
    assert(
      err.message.toLowerCase().includes("not found") ||
      err.message.toLowerCase().includes("does not exist") ||
      err.name === "NoSuchKey" ||
      err.message.includes("empty"),
      `Must report missing object, got: ${err.message}`
    );
  }
  assert.strictEqual(phantomRejected, true, "Missing R2 object must be rejected");
  console.log("  ✓ Missing R2 object rejected.");

  // -------------------------------------------------------------------------
  // TEST 7: R2 Object Verification & Byte Count
  // -------------------------------------------------------------------------
  console.log("\n[TEST 7] Cloudflare R2 Object Verification & Byte Count...");
  const head = await r2ReleaseStorage.headReleaseObject(canonicalMemberKey);
  assert.strictEqual(head.exists, true, "Canonical object must exist in R2");
  assert.strictEqual(head.contentLength, expectedFileSize, "Byte count must match exactly");
  console.log(`  ✓ R2 verified: ${head.contentLength} bytes.`);

  // -------------------------------------------------------------------------
  // TEST 8: SHA-256 Calculation Accuracy
  // -------------------------------------------------------------------------
  console.log("\n[TEST 8] SHA-256 Calculation Accuracy...");
  const computedHash = crypto.createHash("sha256").update(memberBuffer).digest("hex").toLowerCase();
  assert.strictEqual(computedHash, expectedMemberSha256, "Computed hash must match authoritative hash");
  console.log(`  ✓ SHA-256 match verified: ${computedHash}`);

  // -------------------------------------------------------------------------
  // TEST 9: Manifest Consistency
  // -------------------------------------------------------------------------
  console.log("\n[TEST 9] Manifest Consistency...");
  const manifest = await AppsService.getUpdateManifest("member-app");
  assert(manifest, "Manifest must not be null");
  assert.strictEqual(manifest.latestVersionCode, 6, "Manifest must report Build 6");
  assert.strictEqual(manifest.latestVersionName, "1.0.5", "Manifest must report v1.0.5");
  assert.strictEqual(manifest.sha256, expectedMemberSha256, "Manifest hash must match verified binary");
  assert.strictEqual(manifest.fileSize, expectedFileSize, "Manifest size must match verified binary");
  assert(manifest.apkDownloadUrl.includes("/api/apps/member-app/download"), "URL must target canonical gateway");
  console.log("  ✓ Manifest consistency verified.");

  // -------------------------------------------------------------------------
  // TEST 10: Website Download Resolution
  // -------------------------------------------------------------------------
  console.log("\n[TEST 10] Website Download Resolution...");
  const app = await AppsService.getPublishedAppBySlug("member-app");
  assert(app, "Member app must exist");
  const authoritativeUrl = AppsService.resolveAuthoritativeDownloadUrl(app.latestRelease, app);
  assert(authoritativeUrl.includes("/api/apps/member-app/download"), "Authoritative URL must use download gateway");
  console.log(`  ✓ Website download route: ${authoritativeUrl}`);

  // -------------------------------------------------------------------------
  // TEST 11: Android Updater Download Candidate Resolution
  // -------------------------------------------------------------------------
  console.log("\n[TEST 11] Android Updater Download Candidates...");
  assert(manifest.apkDownloadUrl.endsWith(".apk"), "APK download URL must provide clean .apk extension");
  console.log(`  ✓ Updater download target: ${manifest.apkDownloadUrl}`);

  // -------------------------------------------------------------------------
  // TEST 12: Zero Stale Static APK Fallback
  // -------------------------------------------------------------------------
  console.log("\n[TEST 12] Zero Stale Static APK Fallback...");
  // Confirm resolveAuthoritativeDownloadUrl never returns direct static /downloads disk paths
  assert(!authoritativeUrl.startsWith("/downloads"), "Must not fall back to local disk /downloads path");
  console.log("  ✓ Zero static fallback invariant enforced.");

  // -------------------------------------------------------------------------
  // TEST 13: Historical Release Preservation
  // -------------------------------------------------------------------------
  console.log("\n[TEST 13] Historical Release Preservation...");
  const allReleases = await ReleasePublishingService.getAllReleasesWithAudit("member-app");
  assert(allReleases, "Audit releases must not be null");
  assert(allReleases.releases.length >= 3, "Historical releases must be preserved in database");
  console.log(`  ✓ Historical releases preserved: ${allReleases.releases.length} releases found.`);

  // -------------------------------------------------------------------------
  // TEST 14: 1-Click Rollback Execution
  // -------------------------------------------------------------------------
  console.log("\n[TEST 14] 1-Click Rollback Execution...");
  const build6Release = app.allReleases.find((r: any) => r.versionCode === 6);
  assert(build6Release, "Build 6 release must exist");

  const rollbackResult = await ReleasePublishingService.rollbackToRelease("member-app", build6Release.id);
  assert.strictEqual(rollbackResult.success, true, "Rollback to Build 6 must succeed");
  assert.strictEqual(rollbackResult.activeRelease.versionCode, 6, "Active release must be Build 6");
  console.log("  ✓ 1-click rollback successfully verified.");

  // -------------------------------------------------------------------------
  // TEST 15: Failed Publication Handling
  // -------------------------------------------------------------------------
  console.log("\n[TEST 15] Failed Publication Handling...");
  let failedHandled = false;
  try {
    await ReleasePublishingService.publishFromBuffer(Buffer.from("INVALID_DATA"), {
      appSlug: "member-app",
      isPublished: true,
    });
  } catch (err: any) {
    failedHandled = true;
  }
  assert.strictEqual(failedHandled, true, "Must fail cleanly without corrupting active release");
  const postFailApp = await AppsService.getPublishedAppBySlug("member-app");
  assert.strictEqual(postFailApp?.latestRelease?.versionCode, 6, "Active release must remain Build 6");
  console.log("  ✓ Error handled gracefully with zero active catalog corruption.");

  // -------------------------------------------------------------------------
  // TEST 16: CRITICAL FUTURE-RELEASE SIMULATION (Build 7 -> Build 8 -> Rollback)
  // -------------------------------------------------------------------------
  console.log("\n[TEST 16] CRITICAL FUTURE-RELEASE SIMULATION (Zero-Touch Lifecycle)...");
  const testSlug = `test-future-${Date.now()}`;
  const testPkg = `in.sunshine.simulation.${Date.now()}`;

  // Step A: Create isolated simulation test application
  const simApp = await AppsService.createApp({
    slug: testSlug,
    packageName: testPkg,
    name: "Simulation Member App",
    description: "Automated simulation app for release lifecycle verification",
    isPublished: true,
  });

  try {
    // Step B: Publish Build 7
    console.log("  [Step B] Publishing Build 7 (v1.0.6)...");
    const testR2Key7 = `releases/apps/${testSlug}/Simulation-v1.0.6-b7-sim77777.apk`;
    const simBytes7 = Buffer.from("SIMULATED_BUILD_7_BINARY_PAYLOAD_" + Date.now());
    await r2ReleaseStorage.putReleaseObject(testR2Key7, simBytes7);

    const rel7 = await AppsService.createRelease({
      appId: simApp.id,
      versionName: "1.0.6",
      versionCode: 7,
      apkUrl: `/api/apps/${testSlug}/download/Simulation-v1.0.6-b7-sim77777.apk`,
      apkFileName: "Simulation-v1.0.6-b7-sim77777.apk",
      fileSize: simBytes7.length,
      sha256: crypto.createHash("sha256").update(simBytes7).digest("hex"),
      storageKey: testR2Key7,
      storageProvider: "R2",
      releaseNotes: "Automated Build 7 Release Notes",
      isPublished: true,
    });

    const manifest7 = await AppsService.getUpdateManifest(testSlug);
    assert.strictEqual(manifest7?.latestVersionCode, 7, "Manifest must immediately report Build 7");
    assert.strictEqual(manifest7?.latestVersionName, "1.0.6", "Manifest must report v1.0.6");
    console.log(`    ✓ Build 7 published and verified active in manifest: v${manifest7.latestVersionName} (Build ${manifest7.latestVersionCode})`);

    // Step C: Publish Build 8
    console.log("  [Step C] Publishing Build 8 (v1.0.7)...");
    const testR2Key8 = `releases/apps/${testSlug}/Simulation-v1.0.7-b8-sim88888.apk`;
    const simBytes8 = Buffer.from("SIMULATED_BUILD_8_BINARY_PAYLOAD_" + Date.now());
    await r2ReleaseStorage.putReleaseObject(testR2Key8, simBytes8);

    const rel8 = await AppsService.createRelease({
      appId: simApp.id,
      versionName: "1.0.7",
      versionCode: 8,
      apkUrl: `/api/apps/${testSlug}/download/Simulation-v1.0.7-b8-sim88888.apk`,
      apkFileName: "Simulation-v1.0.7-b8-sim88888.apk",
      fileSize: simBytes8.length,
      sha256: crypto.createHash("sha256").update(simBytes8).digest("hex"),
      storageKey: testR2Key8,
      storageProvider: "R2",
      releaseNotes: "Automated Build 8 Release Notes",
      isPublished: true,
    });

    const manifest8 = await AppsService.getUpdateManifest(testSlug);
    assert.strictEqual(manifest8?.latestVersionCode, 8, "Manifest must immediately report Build 8");
    assert.strictEqual(manifest8?.latestVersionName, "1.0.7", "Manifest must report v1.0.7");
    console.log(`    ✓ Build 8 published and automatically promoted to active: v${manifest8.latestVersionName} (Build ${manifest8.latestVersionCode})`);

    // Step D: Confirm Build 7 is preserved in historical releases
    const auditSim = await ReleasePublishingService.getAllReleasesWithAudit(testSlug);
    assert.strictEqual(auditSim?.releases.length, 2, "Both Build 7 and Build 8 must be preserved in history");
    const foundRel7 = auditSim?.releases.find((r) => r.versionCode === 7);
    const foundRel8 = auditSim?.releases.find((r) => r.versionCode === 8);
    assert(foundRel7, "Build 7 must exist in historical releases");
    assert(foundRel8, "Build 8 must exist in historical releases");
    assert.strictEqual(foundRel8?.isCurrent, true, "Build 8 must be current");
    assert.strictEqual(foundRel7?.isCurrent, false, "Build 7 must be historical");
    console.log("    ✓ Both releases preserved in immutable release history.");

    // Step E: Execute Rollback to Build 7
    console.log("  [Step E] Executing 1-click rollback to Build 7...");
    const rollbackSimResult = await ReleasePublishingService.rollbackToRelease(testSlug, rel7.id);
    assert.strictEqual(rollbackSimResult.success, true, "Rollback to Build 7 must succeed");

    // Step F: Verify every download endpoint now serves Build 7
    const manifestRollback = await AppsService.getUpdateManifest(testSlug);
    assert.strictEqual(manifestRollback?.latestVersionCode, 7, "Manifest must now report rolled back Build 7");
    assert.strictEqual(manifestRollback?.latestVersionName, "1.0.6", "Manifest must report rolled back v1.0.6");
    assert.strictEqual(manifestRollback?.fileSize, simBytes7.length, "Manifest fileSize must match Build 7");

    const simAppAfterRollback = await AppsService.getPublishedAppBySlug(testSlug);
    const finalDownloadUrl = AppsService.resolveAuthoritativeDownloadUrl(simAppAfterRollback?.latestRelease, simAppAfterRollback);
    assert(finalDownloadUrl.includes("Simulation-v1.0.6-b7-sim77777.apk"), "Download URL must serve Build 7");
    console.log(`    ✓ Rollback confirmed: manifest and download gateway now serve Build 7: ${finalDownloadUrl}`);
    console.log("    ✓ Zero manual intervention required across all simulated lifecycle events.");
  } finally {
    // Cleanup simulation test application
    await prisma.publishedApp.delete({ where: { id: simApp.id } }).catch(() => {});
  }

  // -------------------------------------------------------------------------
  // FINAL PRODUCTION STATE INVARIANT
  // -------------------------------------------------------------------------
  const finalMemberApp = await AppsService.getPublishedAppBySlug("member-app");
  assert.strictEqual(finalMemberApp?.latestRelease?.versionCode, 6, "Live Member App active release must remain Build 6");
  assert.strictEqual(finalMemberApp?.latestRelease?.sha256, expectedMemberSha256, "Live Member App SHA-256 must match Build 6");

  console.log("\n================================================================");
  console.log("ALL 16 RELEASE SYSTEM TESTS & FUTURE SIMULATION PASSED (100%)");
  console.log("================================================================\n");
}

runComprehensiveReleaseSystemTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  });
