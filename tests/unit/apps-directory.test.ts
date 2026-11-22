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

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock_db?schema=public";
}

import { ApkValidator } from "@/lib/services/apk-validator";
import { AppsService, setAppsDb } from "@/lib/services/apps";

// In-Memory Database Simulation for CI / isolated runner environments
function createMockAppsDb() {
  let apps: any[] = [
    {
      id: "seed_member_app",
      slug: "member-app",
      packageName: "in.sunshineeldercare.member",
      name: "Sunshine Member App",
      tagline: "Elder Care & One-Tap Emergency Support",
      description: "Official Android application for Sunshine Eldercare members.",
      iconUrl: "/images/apps/member-app-icon.png",
      platform: "ANDROID",
      category: "HEALTH_AND_FITNESS",
      isPublished: true,
      isArchived: false,
      currentVersionId: "seed_member_v1",
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [
        {
          id: "seed_member_v1",
          appId: "seed_member_app",
          versionName: "1.0.0",
          versionCode: 1,
          apkUrl: "/downloads/apps/Sunshine-Member-Release.apk",
          apkFileName: "Sunshine-Member-Release.apk",
          fileSize: 45665829,
          sha256: "f1031c6b5854f8dbd6b8c9d43facf44e0ea8572a4afb194575f8b9b00fee5f99",
          certificateFingerprint: "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394",
          minAndroidVersion: "Android 10 (API 29)",
          targetSdkVersion: 36,
          releaseNotes: "Initial release of Sunshine Member App.",
          isMandatory: false,
          isPublished: true,
          downloadCount: 0,
          releasedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    {
      id: "seed_employee_app",
      slug: "employee-app",
      packageName: "in.sunshineeldercare.employee",
      name: "Sunshine Employee App",
      tagline: "Staff Operations & Visit Scheduling",
      description: "Official Android application for Sunshine Eldercare staff.",
      iconUrl: "/images/apps/employee-app-icon.png",
      platform: "ANDROID",
      category: "MEDICAL",
      isPublished: true,
      isArchived: false,
      currentVersionId: "seed_emp_v1",
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [
        {
          id: "seed_emp_v1",
          appId: "seed_employee_app",
          versionName: "1.0.0",
          versionCode: 1,
          apkUrl: "/downloads/apps/Sunshine-Employee-Release.apk",
          apkFileName: "Sunshine-Employee-Release.apk",
          fileSize: 46796266,
          sha256: "4dffa19ec265749aeec8e80963420313124204b7b819d232f857b21eca132682",
          certificateFingerprint: "843d8e746bd6604b61f4284131556a948ad6b70b8720842a38fec3e2e09af8cd",
          minAndroidVersion: "Android 10 (API 29)",
          targetSdkVersion: 36,
          releaseNotes: "Initial release of Sunshine Employee App.",
          isMandatory: false,
          isPublished: true,
          downloadCount: 0,
          releasedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ];

  let releases: any[] = [
    apps[0].versions[0],
    apps[1].versions[0],
  ];

  const db = {
    publishedApp: {
      findMany: async (args?: any) => {
        let result = [...apps];
        if (args?.where) {
          if (args.where.isPublished !== undefined) {
            result = result.filter((a) => a.isPublished === args.where.isPublished);
          }
          if (args.where.isArchived !== undefined) {
            result = result.filter((a) => a.isArchived === args.where.isArchived);
          }
        }
        return result.map((a) => {
          let item = { ...a };
          if (args?.include?.versions) {
            let vers = releases.filter((r) => r.appId === a.id);
            if (args.include.versions.where?.isPublished !== undefined) {
              vers = vers.filter((r) => r.isPublished === args.include.versions.where.isPublished);
            }
            vers.sort((x, y) => y.versionCode - x.versionCode);
            if (args.include.versions.take) {
              vers = vers.slice(0, args.include.versions.take);
            }
            item.versions = vers;
          }
          return item;
        });
      },
      findFirst: async (args: any) => {
        let result = [...apps];
        if (args?.where?.OR) {
          const conditions = args.where.OR;
          result = result.filter((a) =>
            conditions.some((c: any) =>
              (c.slug && a.slug === c.slug) || (c.packageName && a.packageName === c.packageName)
            )
          );
        }
        if (args?.where?.isPublished !== undefined) {
          result = result.filter((a) => a.isPublished === args.where.isPublished);
        }
        if (args?.where?.isArchived !== undefined) {
          result = result.filter((a) => a.isArchived === args.where.isArchived);
        }
        const found = result[0];
        if (!found) return null;
        let item = { ...found };
        if (args?.include?.versions) {
          let vers = releases.filter((r) => r.appId === found.id);
          if (args.include.versions.where?.isPublished !== undefined) {
            vers = vers.filter((r) => r.isPublished === args.include.versions.where.isPublished);
          }
          vers.sort((x, y) => y.versionCode - x.versionCode);
          item.versions = vers;
        }
        return item;
      },
      findUnique: async (args: any) => {
        const found = apps.find((a) => a.id === args.where.id);
        if (!found) return null;
        let item = { ...found };
        if (args?.include?.versions) {
          let vers = releases.filter((r) => r.appId === found.id);
          vers.sort((x, y) => y.versionCode - x.versionCode);
          if (args.include.versions.take) {
            vers = vers.slice(0, args.include.versions.take);
          }
          item.versions = vers;
        }
        return item;
      },
      create: async (args: any) => {
        const newApp = {
          id: `app_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          ...args.data,
          versions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        apps.push(newApp);
        return newApp;
      },
      update: async (args: any) => {
        const idx = apps.findIndex((a) => a.id === args.where.id);
        if (idx >= 0) {
          apps[idx] = { ...apps[idx], ...args.data, updatedAt: new Date() };
          return apps[idx];
        }
        return null;
      },
      delete: async (args: any) => {
        apps = apps.filter((a) => a.id !== args.where.id);
        releases = releases.filter((r) => r.appId !== args.where.id);
        return { success: true };
      },
    },
    appRelease: {
      create: async (args: any) => {
        const newRelease = {
          id: `release_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          downloadCount: 0,
          releasedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        releases.push(newRelease);
        const parent = apps.find((a) => a.id === args.data.appId);
        if (parent) {
          if (!parent.versions) parent.versions = [];
          parent.versions.push(newRelease);
        }
        return newRelease;
      },
      findUnique: async (args: any) => {
        const found = releases.find((r) => r.id === args.where.id);
        if (!found) return null;
        const app = apps.find((a) => a.id === found.appId);
        return { ...found, app };
      },
      findFirst: async (args: any) => {
        let match = releases.filter((r) => r.appId === args.where.appId);
        if (args?.where?.isPublished !== undefined) {
          match = match.filter((r) => r.isPublished === args.where.isPublished);
        }
        match.sort((a, b) => b.versionCode - a.versionCode);
        return match[0] || null;
      },
      update: async (args: any) => {
        const idx = releases.findIndex((r) => r.id === args.where.id);
        if (idx >= 0) {
          if (args.data.downloadCount?.increment) {
            releases[idx].downloadCount += args.data.downloadCount.increment;
          } else {
            releases[idx] = { ...releases[idx], ...args.data, updatedAt: new Date() };
          }
          return releases[idx];
        }
        return null;
      },
      delete: async (args: any) => {
        releases = releases.filter((r) => r.id !== args.where.id);
        return { success: true };
      },
    },
    $transaction: async (fn: any) => {
      return fn(db);
    },
  };

  return db;
}

// In CI runners or when no external DB is reachable, use in-memory database simulation
const shouldUseMock = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes("127.0.0.1") || process.env.CI === "true";
if (shouldUseMock) {
  console.log("ℹ Using isolated in-memory test database for test suite.");
  setAppsDb(createMockAppsDb());
}

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
    const memberApp = apps.find((a: any) => a.slug === "member-app" || a.packageName === "in.sunshineeldercare.member");
    const employeeApp = apps.find((a: any) => a.slug === "employee-app" || a.packageName === "in.sunshineeldercare.employee");

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
    const testAppSlug = `test-draft-${Date.now()}`;
    const testApp = await AppsService.createApp({
      slug: testAppSlug,
      packageName: `in.sunshine.test.${Date.now()}`,
      name: "Test Unpublished App",
      description: "Draft app for testing exclusion",
      isPublished: false, // DRAFT
    });

    try {
      const publicApps = await AppsService.getPublishedApps();
      const foundInPublic = publicApps.find((a: any) => a.slug === testAppSlug);
      assert.strictEqual(foundInPublic, undefined, "Unpublished app must not appear in public catalog");

      const publicSingle = await AppsService.getPublishedAppBySlug(testAppSlug);
      assert.strictEqual(publicSingle, null, "Unpublished app lookup by slug must return null");
    } finally {
      await AppsService.updateApp(testApp.id, { isArchived: true });
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
      await AppsService.createRelease({
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
      await AppsService.createRelease({
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
      const updatedApp = allAdmin.find((a: any) => a.id === app.id);

      assert.strictEqual(updatedApp?.versions.length, 2, "Both releases must be preserved in history");
      assert.strictEqual(updatedApp?.versions[0].versionCode, 2, "Latest release is first (desc order)");
      assert.strictEqual(updatedApp?.versions[1].versionCode, 1, "Prior release is second");
    } finally {
      // Clean up
      await AppsService.updateApp(app.id, { isArchived: true });
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
      await AppsService.createRelease({
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
      await AppsService.updateApp(app.id, { isArchived: true });
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

    const reloaded = await AppsService.getPublishedAppBySlug("member-app");
    assert.strictEqual(reloaded?.latestRelease?.downloadCount, initialDownloads + 1, "Download count must increment by 1");
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
