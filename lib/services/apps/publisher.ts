import { db as prisma } from "@/lib/db";
import { ApkValidator, ApkInspectionResult } from "../apk-validator";
import { r2ReleaseStorage } from "../storage/r2-releases";
import { AppsService } from "./index";
import crypto from "crypto";
import path from "path";

let activeDb: any = prisma;

/**
 * Allows overriding database client for testing or staging environments.
 */
export function setPublisherDb(client: any) {
  activeDb = client;
}

export interface PublishOptions {
  appSlug: "member-app" | "employee-app" | string;
  releaseNotes?: string;
  isMandatory?: boolean;
  isPublished?: boolean; // If false, staged in Draft status awaiting publication approval
  replaceExisting?: boolean; // If true, replaces release with matching versionCode
  gitCommit?: string;
  buildTime?: string;
}

export interface PublishFromStorageOptions extends PublishOptions {
  storageKey: string;
  expectedSize?: number;
  expectedSha256?: string;
  versionName?: string;
  versionCode?: number;
  packageName?: string;
  certificateFingerprint?: string;
}

export interface PublishResult {
  success: boolean;
  releaseId: string;
  appSlug: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  fileSize: number;
  sha256: string;
  storageKey: string;
  storageProvider: "R2";
  downloadUrl: string;
  isPublished: boolean;
  isCurrent: boolean;
  certificateFingerprint?: string;
  acceptanceCheckPassed: boolean;
  acceptanceDetails?: any;
  error?: string;
}

export class ReleasePublishingService {
  /**
   * Authorized certificate SHA-256 fingerprints for official production applications.
   */
  public static readonly AUTHORIZED_FINGERPRINTS: Record<string, string> = {
    "member-app": "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394",
    "employee-app": "843d8e746bd6604b61f4284131556a948ad6b70b8720842a38fec3e2e09af8cd",
  };

  /**
   * Expected Android package names.
   */
  public static readonly EXPECTED_PACKAGES: Record<string, string> = {
    "member-app": "in.sunshineeldercare.member",
    "employee-app": "in.sunshineeldercare.employee",
  };

  /**
   * Generates a canonical, immutable R2 object key for an application release.
   * e.g. releases/apps/member-app/Sunshine-Member-v1.0.5-b6-cf672287.apk
   */
  public static generateImmutableStorageKey(
    appSlug: string,
    versionName: string,
    versionCode: number,
    sha256: string
  ): string {
    const isMember = appSlug === "member-app";
    const isEmployee = appSlug === "employee-app";
    const prefix = isMember ? "Sunshine-Member" : isEmployee ? "Sunshine-Employee" : appSlug;
    const safeVersion = (versionName || "1.0.0").replace(/[^a-zA-Z0-9._-]/g, "_");
    const shortSha = sha256 ? sha256.substring(0, 8).toLowerCase() : Date.now().toString(36);
    return `releases/apps/${appSlug}/${prefix}-v${safeVersion}-b${versionCode}-${shortSha}.apk`;
  }

  /**
   * Core publishing pipeline: processes an APK binary buffer.
   * Used by:
   * 1. Antigravity automated source-code build CLI
   * 2. Server-side multipart form upload
   * 3. CI/CD automated pipeline
   */
  public static async publishFromBuffer(
    buffer: Buffer,
    options: PublishOptions
  ): Promise<PublishResult> {
    const appSlug = options.appSlug || "member-app";
    const isPublished = options.isPublished !== false; // Default true unless explicitly staged

    // 1. Inspect APK buffer in-memory
    const inspection = ApkValidator.inspectApk(buffer);
    if (!inspection.isValid) {
      throw new Error(`APK inspection failed: ${inspection.error || "Corrupted or invalid APK structure"}`);
    }

    const fileSize = buffer.length;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
    const expectedPackage = this.EXPECTED_PACKAGES[appSlug];

    // 2. Validate package ID
    if (expectedPackage && inspection.packageName !== expectedPackage) {
      throw new Error(
        `Package ID mismatch: Expected '${expectedPackage}' for '${appSlug}', but APK contains '${inspection.packageName}'.`
      );
    }

    // 3. Validate signing certificate fingerprint
    const expectedCert = this.AUTHORIZED_FINGERPRINTS[appSlug];
    if (expectedCert && inspection.certificateFingerprint) {
      if (inspection.certificateFingerprint.toLowerCase() !== expectedCert.toLowerCase()) {
        throw new Error(
          `Keystore certificate verification failed: APK signed with unauthorized certificate '${inspection.certificateFingerprint}'. Expected official keystore '${expectedCert}'.`
        );
      }
    }

    // 4. Resolve target application record in database
    const app = await activeDb.publishedApp.findFirst({
      where: {
        OR: [{ slug: appSlug }, { packageName: inspection.packageName }],
      },
      include: {
        versions: {
          orderBy: { versionCode: "desc" },
        },
      },
    });

    if (!app) {
      throw new Error(`Published application with slug '${appSlug}' not found in database.`);
    }

    // 5. Generate canonical immutable R2 key
    const immutableKey = this.generateImmutableStorageKey(
      app.slug,
      inspection.versionName || "1.0.0",
      inspection.versionCode || 1,
      sha256
    );
    const fileName = path.basename(immutableKey);
    const isMember = app.slug === "member-app";
    const canonicalAliasKey = `releases/apps/${app.slug}/${isMember ? "Sunshine-Member" : "Sunshine-Employee"}-Release.apk`;

    // 6. Upload immutable binary to Cloudflare R2
    if (!r2ReleaseStorage.isConfigured()) {
      throw new Error("Cloudflare R2 storage credentials are not configured.");
    }

    await r2ReleaseStorage.putReleaseObject(immutableKey, buffer, {
      sha256,
      fileSize: String(fileSize),
      packageName: inspection.packageName || "",
      versionCode: String(inspection.versionCode),
      versionName: inspection.versionName || "",
      gitCommit: options.gitCommit || "unknown",
      buildTime: options.buildTime || new Date().toISOString(),
    });

    // Also update canonical alias object in R2 for backwards compatibility
    await r2ReleaseStorage.putReleaseObject(canonicalAliasKey, buffer, {
      sha256,
      fileSize: String(fileSize),
      packageName: inspection.packageName || "",
      versionCode: String(inspection.versionCode),
      versionName: inspection.versionName || "",
    });

    // 7. R2 Read-Back Verification (Prove storage integrity from R2)
    const readBackBuffer = await r2ReleaseStorage.getObjectBuffer(immutableKey);
    const readBackSha = crypto.createHash("sha256").update(readBackBuffer).digest("hex").toLowerCase();
    if (readBackSha !== sha256) {
      throw new Error(
        `Cloudflare R2 storage verification failed: read-back SHA-256 '${readBackSha}' does not match uploaded binary SHA-256 '${sha256}'.`
      );
    }
    if (readBackBuffer.length !== fileSize) {
      throw new Error(
        `Cloudflare R2 byte count mismatch: read-back size '${readBackBuffer.length}' does not match expected size '${fileSize}'.`
      );
    }

    // 8. Register release in database catalog
    const matchingRelease = app.versions.find((v: any) => v.versionCode === inspection.versionCode);
    let releaseRecord: any = null;

    const releaseData = {
      versionName: inspection.versionName || "1.0.0",
      versionCode: inspection.versionCode || 1,
      apkUrl: `/api/apps/${app.slug}/download/${fileName}`,
      apkFileName: fileName,
      fileSize,
      sha256,
      certificateFingerprint: inspection.certificateFingerprint || null,
      minAndroidVersion: inspection.minSdkVersion || "Android 10 (API 29)",
      targetSdkVersion: inspection.targetSdkVersion || 36,
      releaseNotes: options.releaseNotes || `Release v${inspection.versionName} (Build ${inspection.versionCode})`,
      isMandatory: Boolean(options.isMandatory),
      isPublished,
      storageKey: immutableKey,
      storageProvider: "R2",
    };

    if (matchingRelease && options.replaceExisting) {
      releaseRecord = await activeDb.appRelease.update({
        where: { id: matchingRelease.id },
        data: releaseData,
      });
    } else if (matchingRelease) {
      throw new Error(
        `Release with versionCode ${inspection.versionCode} already exists (ID: ${matchingRelease.id}). Use replaceExisting to overwrite.`
      );
    } else {
      releaseRecord = await activeDb.appRelease.create({
        data: {
          appId: app.id,
          ...releaseData,
        },
      });
    }

    // 9. If marked as published, update active version pointer
    let isCurrent = false;
    if (isPublished) {
      await activeDb.publishedApp.update({
        where: { id: app.id },
        data: { currentVersionId: releaseRecord.id },
      });
      isCurrent = true;
    }

    // 10. Run automated release acceptance check
    const acceptance = await AppsService.runReleaseAcceptanceCheck(releaseRecord.id);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.sunshineeldercare.in";
    const downloadUrl = `${baseUrl}/api/apps/${app.slug}/download/${fileName}`;

    return {
      success: acceptance.passed,
      releaseId: releaseRecord.id,
      appSlug: app.slug,
      packageName: inspection.packageName || "",
      versionName: inspection.versionName || "",
      versionCode: inspection.versionCode || 1,
      fileSize,
      sha256,
      storageKey: immutableKey,
      storageProvider: "R2",
      downloadUrl,
      isPublished,
      isCurrent,
      certificateFingerprint: inspection.certificateFingerprint,
      acceptanceCheckPassed: acceptance.passed,
      acceptanceDetails: acceptance,
      error: acceptance.passed ? undefined : acceptance.error,
    };
  }

  /**
   * Finalizes a release uploaded directly to Cloudflare R2 from the Admin Panel browser.
   */
  public static async publishFromR2Storage(
    options: PublishFromStorageOptions
  ): Promise<PublishResult> {
    const { storageKey } = options;
    if (!storageKey) {
      throw new Error("Missing storageKey for R2 publication.");
    }

    // 1. Fetch object from R2 to inspect and verify
    if (!r2ReleaseStorage.isConfigured()) {
      throw new Error("Cloudflare R2 storage credentials are not configured.");
    }

    const buffer = await r2ReleaseStorage.getObjectBuffer(storageKey);
    if (!buffer || buffer.length === 0) {
      throw new Error(`Object '${storageKey}' not found or empty in Cloudflare R2.`);
    }

    // Pass to core buffer publishing pipeline
    return this.publishFromBuffer(buffer, {
      appSlug: options.appSlug,
      releaseNotes: options.releaseNotes,
      isMandatory: options.isMandatory,
      isPublished: options.isPublished,
      replaceExisting: options.replaceExisting,
      gitCommit: options.gitCommit,
    });
  }

  /**
   * 1-Click Rollback / Set Active Release:
   * Sets the active release pointer (currentVersionId) to any existing verified release.
   * Completely preserves historical releases without data loss or binary deletion.
   */
  public static async rollbackToRelease(
    appSlug: string,
    targetReleaseId: string
  ): Promise<{
    success: boolean;
    activeRelease: any;
    appSlug: string;
    downloadUrl: string;
  }> {
    const app = await activeDb.publishedApp.findFirst({
      where: { slug: appSlug },
      include: {
        versions: true,
      },
    });

    if (!app) {
      throw new Error(`Application with slug '${appSlug}' not found.`);
    }

    const targetRelease = app.versions.find((v: any) => v.id === targetReleaseId);
    if (!targetRelease) {
      throw new Error(`Target release '${targetReleaseId}' does not belong to '${appSlug}'.`);
    }

    // Verify target binary still exists in R2 or storage
    if (targetRelease.storageKey && r2ReleaseStorage.isConfigured()) {
      const head = await r2ReleaseStorage.headReleaseObject(targetRelease.storageKey);
      if (!head.exists) {
        throw new Error(
          `Cannot rollback: binary for release Build ${targetRelease.versionCode} not found in storage at '${targetRelease.storageKey}'.`
        );
      }
    }

    // Atomically update active pointer
    if (typeof activeDb.$transaction === "function") {
      await activeDb.$transaction([
        activeDb.appRelease.update({
          where: { id: targetReleaseId },
          data: { isPublished: true },
        }),
        activeDb.publishedApp.update({
          where: { id: app.id },
          data: { currentVersionId: targetReleaseId },
        }),
      ]);
    } else {
      await activeDb.appRelease.update({
        where: { id: targetReleaseId },
        data: { isPublished: true },
      });
      await activeDb.publishedApp.update({
        where: { id: app.id },
        data: { currentVersionId: targetReleaseId },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.sunshineeldercare.in";
    const downloadUrl = `${baseUrl}/api/apps/${app.slug}/download/${targetRelease.apkFileName}`;

    return {
      success: true,
      activeRelease: {
        id: targetRelease.id,
        versionName: targetRelease.versionName,
        versionCode: targetRelease.versionCode,
        fileSize: targetRelease.fileSize,
        sha256: targetRelease.sha256,
        apkFileName: targetRelease.apkFileName,
        storageKey: targetRelease.storageKey,
      },
      appSlug,
      downloadUrl,
    };
  }

  /**
   * Returns all releases for an application with storage verification and active status.
   */
  public static async getAllReleasesWithAudit(appSlug: string) {
    const app = await activeDb.publishedApp.findFirst({
      where: { slug: appSlug },
      include: {
        versions: {
          orderBy: { versionCode: "desc" },
        },
      },
    });

    if (!app) return null;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.sunshineeldercare.in";

    const enrichedVersions = await Promise.all(
      app.versions.map(async (v: any) => {
        const isCurrent = app.currentVersionId === v.id;
        let r2Verified = false;

        if (v.storageKey && r2ReleaseStorage.isConfigured()) {
          const head = await r2ReleaseStorage.headReleaseObject(v.storageKey);
          r2Verified = head.exists && head.contentLength === v.fileSize;
        }

        // Generate a presigned direct download URL for this specific historical release
        let historicalDownloadUrl: string | null = null;
        if (v.storageKey && r2ReleaseStorage.isConfigured()) {
          try {
            historicalDownloadUrl = await r2ReleaseStorage.getPresignedDownloadUrl(
              v.storageKey,
              v.apkFileName,
              3600
            );
          } catch {}
        }

        return {
          id: v.id,
          versionName: v.versionName,
          versionCode: v.versionCode,
          fileSize: v.fileSize,
          sha256: v.sha256,
          apkFileName: v.apkFileName,
          apkUrl: `${baseUrl}/api/apps/${app.slug}/download/${v.apkFileName}`,
          historicalDownloadUrl,
          storageKey: v.storageKey,
          storageProvider: v.storageProvider,
          certificateFingerprint: v.certificateFingerprint,
          minAndroidVersion: v.minAndroidVersion,
          releaseNotes: v.releaseNotes,
          isMandatory: v.isMandatory,
          isPublished: v.isPublished,
          isCurrent,
          r2Verified,
          downloadCount: v.downloadCount,
          releasedAt: v.releasedAt,
          createdAt: v.createdAt,
        };
      })
    );

    return {
      appId: app.id,
      slug: app.slug,
      name: app.name,
      packageName: app.packageName,
      currentVersionId: app.currentVersionId,
      releases: enrichedVersions,
    };
  }
}
