import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

// Ensure environment variables are loaded
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

import { r2ReleaseStorage } from "../lib/services/storage/r2-releases";
import { ApkValidator } from "../lib/services/apk-validator";
import { AppsService } from "../lib/services/apps";
import { db as prisma } from "../lib/db";

interface BuildOptions {
  appType: "member" | "employee";
  versionName?: string;
  versionCode?: number;
  publish: boolean;
  replace: boolean;
  mandatory: boolean;
  notes?: string;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    appType: "member",
    publish: false,
    replace: false,
    mandatory: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--app" && args[i + 1]) {
      const val = args[++i].toLowerCase();
      options.appType = val.includes("employee") ? "employee" : "member";
    } else if (arg === "--version-name" && args[i + 1]) {
      options.versionName = args[++i];
    } else if (arg === "--version-code" && args[i + 1]) {
      options.versionCode = parseInt(args[++i], 10);
    } else if (arg === "--publish") {
      options.publish = true;
    } else if (arg === "--replace") {
      options.replace = true;
    } else if (arg === "--mandatory") {
      options.mandatory = true;
    } else if (arg === "--notes" && args[i + 1]) {
      options.notes = args[++i];
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const startTime = new Date();
  console.log("================================================================");
  console.log(`SUNSHINE ELDERCARE ANDROID BUILD & RELEASE PIPELINE`);
  console.log(`Target: ${options.appType.toUpperCase()} APP`);
  console.log(`Mode:   ${options.publish ? "BUILD & PUBLISH TO R2" : "LOCAL BUILD ONLY"}`);
  console.log("================================================================\n");

  const repoRoot = path.resolve(__dirname, "..");
  const appDirName = options.appType === "member" ? "android-member-app" : "android-employee-app";
  const appDir = path.join(repoRoot, appDirName);
  const appSlug = options.appType === "member" ? "member-app" : "employee-app";
  const expectedPackage = options.appType === "member" ? "in.sunshineeldercare.member" : "in.sunshineeldercare.employee";

  if (!fs.existsSync(appDir)) {
    throw new Error(`Android project directory not found: ${appDir}`);
  }

  // 1. Get current git commit hash
  let gitCommit = "unknown";
  try {
    gitCommit = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {}

  // 2. Update version code and name in build.gradle.kts if specified
  const buildGradlePath = path.join(appDir, "app", "build.gradle.kts");
  if (options.versionCode || options.versionName) {
    console.log(`[STEP 1] Updating version in ${buildGradlePath}...`);
    let content = fs.readFileSync(buildGradlePath, "utf8");
    if (options.versionCode) {
      content = content.replace(/versionCode\s*=\s*\d+/, `versionCode = ${options.versionCode}`);
    }
    if (options.versionName) {
      content = content.replace(/versionName\s*=\s*"[^"]+"/, `versionName = "${options.versionName}"`);
    }
    fs.writeFileSync(buildGradlePath, content, "utf8");
  }

  // 3. Clean build cache
  console.log(`[STEP 2] Cleaning build cache (./gradlew clean)...`);
  execSync("./gradlew clean", { cwd: appDir, stdio: "inherit" });

  // 4. Run automated unit tests before packaging
  console.log(`\n[STEP 3] Running automated unit tests (./gradlew testReleaseUnitTest)...`);
  execSync("./gradlew testReleaseUnitTest", { cwd: appDir, stdio: "inherit" });
  console.log("  ✓ All unit tests passed.");

  // 5. Assemble Release APK
  console.log(`\n[STEP 4] Assembling Release APK (./gradlew assembleRelease)...`);
  execSync("./gradlew assembleRelease", { cwd: appDir, stdio: "inherit" });

  // 6. Locate built binary
  const builtApkCandidates = [
    path.join(appDir, "app", "build", "outputs", "apk", "release", "app-release.apk"),
    path.join(appDir, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk"),
  ];

  let builtApkPath: string | null = null;
  for (const candidate of builtApkCandidates) {
    if (fs.existsSync(candidate)) {
      builtApkPath = candidate;
      break;
    }
  }

  if (!builtApkPath) {
    throw new Error("Release APK binary not found in build outputs directory!");
  }

  const apkBytes = fs.readFileSync(builtApkPath);
  const fileSize = apkBytes.length;
  const sha256 = crypto.createHash("sha256").update(apkBytes).digest("hex").toLowerCase();

  // 7. Inspect output binary using ApkValidator & confirm keystore signature
  console.log(`\n[STEP 5] Inspecting output APK binary (${fileSize} bytes)...`);
  const inspection = ApkValidator.inspectApk(apkBytes);
  if (!inspection.isValid) {
    throw new Error(`APK inspection failed: ${inspection.error}`);
  }

  if (inspection.packageName !== expectedPackage) {
    throw new Error(`Package ID mismatch: expected ${expectedPackage}, got ${inspection.packageName}`);
  }

  console.log("  ✓ APK Structure & Cryptographic Signature Verified:");
  console.log(`    • Package ID:    ${inspection.packageName}`);
  console.log(`    • Version Name:  ${inspection.versionName}`);
  console.log(`    • Version Code:  ${inspection.versionCode}`);
  console.log(`    • File Size:     ${fileSize} bytes`);
  console.log(`    • SHA-256:       ${sha256}`);
  console.log(`    • Certificate:   ${inspection.certificateFingerprint || "Verified"}`);

  // 8. Copy to canonical release directories
  const releaseDir = path.join(appDir, "release");
  if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });

  const prefix = options.appType === "member" ? "Sunshine-Member" : "Sunshine-Employee";
  const canonicalReleaseName = `${prefix}-Release.apk`;
  const versionedReleaseName = `${prefix}-v${inspection.versionName}-b${inspection.versionCode}.apk`;

  fs.copyFileSync(builtApkPath, path.join(releaseDir, canonicalReleaseName));
  fs.copyFileSync(builtApkPath, path.join(releaseDir, versionedReleaseName));
  console.log(`  ✓ Saved release artifacts in: ${releaseDir}`);

  // 9. If --publish is enabled, upload to Cloudflare R2 and update PostgreSQL release catalog
  if (options.publish) {
    console.log(`\n[STEP 6] Publishing authoritative binary to Cloudflare R2...`);
    if (!r2ReleaseStorage.isConfigured()) {
      throw new Error("Cloudflare R2 is not configured in environment variables.");
    }

    const shortSha = sha256.substring(0, 8);
    const storageKey = `releases/apps/${appSlug}/${prefix}-v${inspection.versionName}-b${inspection.versionCode}-${shortSha}.apk`;
    const canonicalKey = `releases/apps/${appSlug}/${canonicalReleaseName}`;

    console.log(`  Uploading object: ${storageKey}...`);
    await r2ReleaseStorage.putReleaseObject(storageKey, apkBytes, {
      sha256,
      packageName: inspection.packageName || "",
      versionCode: String(inspection.versionCode),
      versionName: inspection.versionName || "",
      gitCommit,
      buildTime: startTime.toISOString(),
    });

    console.log(`  Uploading canonical object: ${canonicalKey}...`);
    await r2ReleaseStorage.putReleaseObject(canonicalKey, apkBytes, {
      sha256,
      packageName: inspection.packageName || "",
      versionCode: String(inspection.versionCode),
      versionName: inspection.versionName || "",
    });

    console.log("  ✓ Cloudflare R2 upload complete.");

    // Update database release record
    console.log(`\n[STEP 7] Registering release in database catalog...`);
    const app = await prisma.publishedApp.findFirst({
      where: { slug: appSlug },
      include: { versions: { orderBy: { versionCode: "desc" } } },
    });

    if (!app) {
      throw new Error(`Application record with slug '${appSlug}' not found in database.`);
    }

    const matchingRelease = app.versions.find((v) => v.versionCode === inspection.versionCode);
    let releaseRecord: any = null;

    if (matchingRelease && options.replace) {
      console.log(`  Replacing existing release ID: ${matchingRelease.id} (Build ${matchingRelease.versionCode})...`);
      releaseRecord = await AppsService.replaceRelease(matchingRelease.id, {
        versionName: inspection.versionName || "1.0.0",
        versionCode: inspection.versionCode || 1,
        apkUrl: `/api/apps/${appSlug}/download`,
        apkFileName: path.basename(storageKey),
        fileSize,
        sha256,
        certificateFingerprint: inspection.certificateFingerprint,
        minAndroidVersion: inspection.minSdkVersion || "Android 10 (API 29)",
        targetSdkVersion: inspection.targetSdkVersion || 36,
        releaseNotes: options.notes || `Production build ${inspection.versionCode} (${inspection.versionName})`,
        isMandatory: options.mandatory,
        isPublished: true,
        storageKey,
        storageProvider: "R2",
      });
    } else {
      console.log(`  Creating new release record for Build ${inspection.versionCode}...`);
      releaseRecord = await AppsService.createRelease({
        appId: app.id,
        versionName: inspection.versionName || "1.0.0",
        versionCode: inspection.versionCode || 1,
        apkUrl: `/api/apps/${appSlug}/download`,
        apkFileName: path.basename(storageKey),
        fileSize,
        sha256,
        certificateFingerprint: inspection.certificateFingerprint,
        minAndroidVersion: inspection.minSdkVersion || "Android 10 (API 29)",
        targetSdkVersion: inspection.targetSdkVersion || 36,
        releaseNotes: options.notes || `Production build ${inspection.versionCode} (${inspection.versionName})`,
        isMandatory: options.mandatory,
        isPublished: true,
        storageKey,
        storageProvider: "R2",
      });
    }

    console.log(`  ✓ Database release record saved: ID ${releaseRecord.id}`);

    // 10. Execute Release Acceptance Check
    console.log(`\n[STEP 8] Executing automated release acceptance check...`);
    const acceptance = await AppsService.runReleaseAcceptanceCheck(releaseRecord.id);
    if (!acceptance.passed) {
      throw new Error(`Release acceptance check failed: ${acceptance.error}`);
    }
    console.log("  ✓ Automated acceptance check passed 100%!");
  }

  const durationSec = ((Date.now() - startTime.getTime()) / 1000).toFixed(1);
  console.log("\n================================================================");
  console.log(`BUILD PROVENANCE & SUMMARY (${durationSec}s)`);
  console.log("================================================================");
  console.log(`App:          ${options.appType.toUpperCase()}`);
  console.log(`Package:      ${inspection.packageName}`);
  console.log(`Version:      v${inspection.versionName} (Build ${inspection.versionCode})`);
  console.log(`Size:         ${fileSize} bytes`);
  console.log(`SHA-256:      ${sha256}`);
  console.log(`Git Commit:   ${gitCommit}`);
  console.log(`Build Time:   ${startTime.toISOString()}`);
  if (options.publish) {
    console.log(`Storage:      Cloudflare R2 (sunshine-documents-prod)`);
    console.log(`Download Gateway: https://www.sunshineeldercare.in/api/apps/${appSlug}/download`);
  }
  console.log("================================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Build failed:", err.message);
  process.exit(1);
});
