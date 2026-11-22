import assert from "node:assert";
import fs from "fs";
import path from "path";

// Automatically configure DATABASE_URL from session file if running in local CLI
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

async function runAppsDirectoryTestSuite() {
  console.log("================================================================");
  console.log("SUNSHINE APPS DIRECTORY & DISTRIBUTION PORTAL TEST SUITE");
  console.log("================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    return (async () => {
      try {
        await fn();
        console.log(`  ✓ [TEST ${totalTests}] ${name}`);
        passedTests++;
      } catch (err: any) {
        console.error(`  ✗ [TEST ${totalTests}] ${name}`);
        console.error(`    Error: ${err.message}`);
        throw err;
      }
    })();
  }

  // -------------------------------------------------------------
  // Test 1: Public Apps Directory queries without login
  // -------------------------------------------------------------
  await test("Scenario 1: Public /apps query executes cleanly without authentication", async () => {
    const apps = await AppsService.getPublishedApps();
    assert(Array.isArray(apps), "Expected getPublishedApps to return an array");
    console.log(`    Found ${apps.length} published applications in database.`);
  });

  // -------------------------------------------------------------
  // Test 2: Published applications appear correctly
  // -------------------------------------------------------------
  await test("Scenario 2: Published Member App & Employee App appear with version metadata", async () => {
    const apps = await AppsService.getPublishedApps();
    const memberApp = apps.find((a) => a.slug === "member-app" || a.packageName === "in.sunshineeldercare.member");
    const employeeApp = apps.find((a) => a.slug === "employee-app" || a.packageName === "in.sunshineeldercare.employee");

    assert(memberApp, "Member App should be present in published catalog");
    assert(employeeApp, "Employee App should be present in published catalog");

    assert(memberApp.name.includes("Member"), "Member App display name should be set");
    assert(employeeApp.name.includes("Employee"), "Employee App display name should be set");
    assert(memberApp.latestRelease !== null, "Member App must have a latest release");
    assert(employeeApp.latestRelease !== null, "Employee App must have a latest release");
    assert(typeof memberApp.latestRelease?.fileSize === "number", "File size must be numeric");
    assert(memberApp.latestRelease?.sha256.length === 64, "SHA-256 must be 64-char hex");
  });

  // -------------------------------------------------------------
  // Test 3: Unpublished applications remain invisible
  // -------------------------------------------------------------
  await test("Scenario 3: Unpublished and archived apps are excluded from public directory", async () => {
    // Query directly with raw filter vs service
    const testAppSlug = `test-draft-${Date.now()}`;
    const testApp = await prisma.publishedApp.create({
      data: {
        slug: testAppSlug,
        packageName: `in.sunshine.test.${Date.now()}`,
        name: "Test Unpublished App",
        description: "Draft app for testing exclusion",
        isPublished: false, // DRAFT
        isArchived: false,
      },
    });

    try {
      const publicApps = await AppsService.getPublishedApps();
      const foundInPublic = publicApps.find((a) => a.slug === testAppSlug);
      assert.strictEqual(foundInPublic, undefined, "Unpublished app must not appear in public catalog");

      const publicSingle = await AppsService.getPublishedAppBySlug(testAppSlug);
      assert.strictEqual(publicSingle, null, "Unpublished app lookup by slug must return null");
    } finally {
      await prisma.publishedApp.delete({ where: { id: testApp.id } });
    }
  });

  // -------------------------------------------------------------
  // Test 4: APK inspection on real Member and Employee APKs
  // -------------------------------------------------------------
  await test("Scenario 4: Real Member & Employee APK binaries pass integrity inspection", async () => {
    const memberApkPath = path.join(process.cwd(), "public/downloads/apps/Sunshine-Member-Release.apk");
    const employeeApkPath = path.join(process.cwd(), "public/downloads/apps/Sunshine-Employee-Release.apk");

    assert(fs.existsSync(memberApkPath), "Sunshine-Member-Release.apk must exist in public/downloads/apps");
    assert(fs.existsSync(employeeApkPath), "Sunshine-Employee-Release.apk must exist in public/downloads/apps");

    const memberBuf = fs.readFileSync(memberApkPath);
    const employeeBuf = fs.readFileSync(employeeApkPath);

    const memberInspect = ApkValidator.inspectApk(memberBuf);
    assert(memberInspect.isValid, "Member APK inspection must be valid");
    assert.strictEqual(memberInspect.packageName, "in.sunshineeldercare.member");
    assert(memberInspect.sha256.length === 64, "Valid SHA-256 hash");

    const employeeInspect = ApkValidator.inspectApk(employeeBuf);
    assert(employeeInspect.isValid, "Employee APK inspection must be valid");
    assert.strictEqual(employeeInspect.packageName, "in.sunshineeldercare.employee");
    assert(employeeInspect.sha256.length === 64, "Valid SHA-256 hash");
  });

  // -------------------------------------------------------------
  // Test 5: Reject invalid APKs (corrupted, non-APK, or wrong headers)
  // -------------------------------------------------------------
  await test("Scenario 5: Corrupted, empty, or non-APK buffers are rejected", async () => {
    const emptyBuf = Buffer.from("");
    const emptyInspect = ApkValidator.inspectApk(emptyBuf);
    assert.strictEqual(emptyInspect.isValid, false, "Empty buffer must be rejected");

    const randomBuf = Buffer.from("Not a real ZIP or APK header at all!");
    const randomInspect = ApkValidator.inspectApk(randomBuf);
    assert.strictEqual(randomInspect.isValid, false, "Random bytes must be rejected");
  });

  // -------------------------------------------------------------
  // Test 6: Package name continuity validation
  // -------------------------------------------------------------
  await test("Scenario 6: Package mismatch between app and uploaded APK is rejected", async () => {
    const verification = ApkValidator.verifyApkUpdate(
      {
        packageName: "in.sunshineeldercare.member",
        latestCertFingerprint: "abcd1234ef",
        latestVersionCode: 1,
      },
      {
        isValid: true,
        fileSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        packageName: "in.sunshineeldercare.employee", // MISMATCH
        versionCode: 2,
        versionName: "2.0.0",
        certificateFingerprint: "abcd1234ef",
      }
    );

    assert.strictEqual(verification.valid, false, "Package mismatch must fail");
    assert(verification.reason?.toLowerCase().includes("package"), "Reason must specify package mismatch");
  });

  // -------------------------------------------------------------
  // Test 7: Signing certificate continuity validation
  // -------------------------------------------------------------
  await test("Scenario 7: Mismatched signing certificate fingerprint is rejected", async () => {
    const verification = ApkValidator.verifyApkUpdate(
      {
        packageName: "in.sunshineeldercare.member",
        latestCertFingerprint: "TRUSTED_FINGERPRINT_370b03fd0c87a9a4620e41fac3859ceeb81ab987",
        latestVersionCode: 1,
      },
      {
        isValid: true,
        fileSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        packageName: "in.sunshineeldercare.member",
        versionCode: 2,
        versionName: "2.0.0",
        certificateFingerprint: "UNTRUSTED_ATTACKER_KEY_99999999999999999999999999999999",
      }
    );

    assert.strictEqual(verification.valid, false, "Mismatched signing key must fail");
    assert(verification.reason?.toLowerCase().includes("signing certificate mismatch"), "Reason must specify certificate mismatch");
  });

  // -------------------------------------------------------------
  // Test 8: Version code downgrade rejection
  // -------------------------------------------------------------
  await test("Scenario 8: Version code downgrade (equal or lower) is rejected", async () => {
    const verification = ApkValidator.verifyApkUpdate(
      {
        packageName: "in.sunshineeldercare.member",
        latestCertFingerprint: "KEY123",
        latestVersionCode: 10,
      },
      {
        isValid: true,
        fileSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        packageName: "in.sunshineeldercare.member",
        versionCode: 9, // LOWER THAN 10
        versionName: "0.9.0",
        certificateFingerprint: "KEY123",
      }
    );

    assert.strictEqual(verification.valid, false, "Version code downgrade must fail");
    assert(verification.reason?.includes("greater than"), "Reason must indicate downgrade error");
  });

  // -------------------------------------------------------------
  // Test 9: Release history preservation
  // -------------------------------------------------------------
  await test("Scenario 9: Previous release history remains intact upon new version creation", async () => {
    const testAppSlug = `test-hist-${Date.now()}`;
    const app = await AppsService.createApp({
      slug: testAppSlug,
      packageName: `in.sunshine.history.${Date.now()}`,
      name: "History Test App",
      description: "Testing history preservation",
      isPublished: true,
    });

    try {
      // Add Release 1
      const r1 = await AppsService.createRelease({
        appId: app.id,
        versionName: "1.0.0",
        versionCode: 1,
        apkUrl: "/downloads/apps/test1.apk",
        apkFileName: "test1.apk",
        fileSize: 1000,
        sha256: "1111111111111111111111111111111111111111111111111111111111111111",
        isPublished: true,
      });

      // Add Release 2
      const r2 = await AppsService.createRelease({
        appId: app.id,
        versionName: "1.1.0",
        versionCode: 2,
        apkUrl: "/downloads/apps/test2.apk",
        apkFileName: "test2.apk",
        fileSize: 2000,
        sha256: "2222222222222222222222222222222222222222222222222222222222222222",
        isPublished: true,
      });

      // Fetch all releases for this app
      const allAdmin = await AppsService.getAllAppsAdmin();
      const updatedApp = allAdmin.find((a) => a.id === app.id);

      assert.strictEqual(updatedApp?.versions.length, 2, "Both releases must be preserved in history");
      assert.strictEqual(updatedApp?.versions[0].versionCode, 2, "Latest release is first (desc order)");
      assert.strictEqual(updatedApp?.versions[1].versionCode, 1, "Prior release is second");
    } finally {
      await prisma.publishedApp.delete({ where: { id: app.id } });
    }
  });

  // -------------------------------------------------------------
  // Test 10: Toggle release publish / withdraw
  // -------------------------------------------------------------
  await test("Scenario 10: Admin can withdraw an incorrect release, updating current version", async () => {
    const testAppSlug = `test-withdraw-${Date.now()}`;
    const app = await AppsService.createApp({
      slug: testAppSlug,
      packageName: `in.sunshine.withdraw.${Date.now()}`,
      name: "Withdraw Test App",
      description: "Testing release withdrawal",
      isPublished: true,
    });

    try {
      const r1 = await AppsService.createRelease({
        appId: app.id,
        versionName: "1.0.0",
        versionCode: 1,
        apkUrl: "/downloads/apps/w1.apk",
        apkFileName: "w1.apk",
        fileSize: 1000,
        sha256: "3333333333333333333333333333333333333333333333333333333333333333",
        isPublished: true,
      });

      const r2 = await AppsService.createRelease({
        appId: app.id,
        versionName: "2.0.0",
        versionCode: 2,
        apkUrl: "/downloads/apps/w2.apk",
        apkFileName: "w2.apk",
        fileSize: 2000,
        sha256: "4444444444444444444444444444444444444444444444444444444444444444",
        isPublished: true,
      });

      // Withdraw v2.0.0
      await AppsService.togglePublishRelease(r2.id, false);

      // Verify manifest now points back to v1.0.0
      const manifest = await AppsService.getUpdateManifest(testAppSlug);
      assert.strictEqual((manifest as any).latestVersionCode, 1, "Withdrawing v2 must fall back to v1");
    } finally {
      await prisma.publishedApp.delete({ where: { id: app.id } });
    }
  });

  // -------------------------------------------------------------
  // Test 11: Update manifest API response structure
  // -------------------------------------------------------------
  await test("Scenario 11: Update manifest returns required schema fields for automated updates", async () => {
    const manifest = (await AppsService.getUpdateManifest("member-app")) as any;
    assert(manifest, "Manifest for member-app must exist");

    assert.strictEqual(manifest.appId, "member-app");
    assert.strictEqual(manifest.packageName, "in.sunshineeldercare.member");
    assert.strictEqual(typeof manifest.latestVersionName, "string");
    assert.strictEqual(typeof manifest.latestVersionCode, "number");
    assert(manifest.apkDownloadUrl.includes(".apk"), "Must include APK download link");
    assert.strictEqual(manifest.sha256.length, 64, "Must include 64-char SHA-256");
    assert(typeof manifest.fileSize === "number", "File size must be present");
    assert(typeof manifest.minSupportedVersion === "string", "Min supported version must be present");
  });

  // -------------------------------------------------------------
  // Test 12: Download counter increments correctly
  // -------------------------------------------------------------
  await test("Scenario 12: Download tracking telemetery increments without blocking", async () => {
    const app = await AppsService.getPublishedAppBySlug("member-app");
    assert(app?.latestRelease, "Member app release must exist");

    const initialDownloads = app.latestRelease.downloadCount;
    await AppsService.recordDownload(app.latestRelease.id);

    const reloaded = await prisma.appRelease.findUnique({
      where: { id: app.latestRelease.id },
    });

    assert.strictEqual(reloaded?.downloadCount, initialDownloads + 1, "Download count must increment by 1");
  });

  // -------------------------------------------------------------
  // Test 13: Catalog manifest endpoint contains all published apps
  // -------------------------------------------------------------
  await test("Scenario 13: Catalog manifest without slug parameter returns array of apps", async () => {
    const catalog = (await AppsService.getUpdateManifest()) as any[];
    assert(Array.isArray(catalog), "Catalog manifest must be an array");
    assert(catalog.length >= 2, "Catalog manifest must contain Member and Employee apps");
    assert(catalog.some((c) => c.appId === "member-app"), "Catalog contains member-app");
    assert(catalog.some((c) => c.appId === "employee-app"), "Catalog contains employee-app");
  });

  // -------------------------------------------------------------
  // Test 14: Non-admin authorization guard
  // -------------------------------------------------------------
  await test("Scenario 14: Authorization guards protect administrative mutation actions", async () => {
    // Dynamically verify AuthorizationService blocks unauthorized users
    const { AuthorizationService } = await import("@/lib/services/authorization");
    const fakeUserId = "fake_unauthorized_user_99999";
    const hasAdmin = await AuthorizationService.hasAdminPortalAccess(fakeUserId, "regular.user@example.com");
    assert.strictEqual(hasAdmin, false, "Regular user must NOT have admin access");
  });

  console.log("\n================================================================");
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("================================================================\n");
}

runAppsDirectoryTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
