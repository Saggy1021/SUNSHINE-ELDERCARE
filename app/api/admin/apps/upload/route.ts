import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { ApkValidator, parseAxml, ApkInspectionResult } from "@/lib/services/apk-validator";
import { db as prisma } from "@/lib/db";
import { r2ReleaseStorage } from "@/lib/services/storage/r2-releases";
import { AppsService } from "@/lib/services/apps";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Admin-only API endpoint to inspect, upload, and verify an APK release.
 * Supports:
 * 1. Direct Presigned Upload (Browser -> Cloudflare R2): Bypasses Vercel 4.5MB limit,
 *    supports 50MB+ APKs with real-time percentage progress bar.
 * 2. R2 Post-Upload Verification: Confirms binary presence and byte count before DB release record creation.
 * 3. Release Acceptance Check: Automated end-to-end verification of binary, manifest, and signature.
 * 4. Multipart form upload fallback for local testing or small files.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and authorize admin
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized: Please sign in" }, { status: 401 });
    }

    const isOwner = session.user.email === "info.sunshineeldercare.gmail.com" || session.user.email === "info.sunshineeldercare@gmail.com";
    const hasAdmin =
      isOwner ||
      (await AuthorizationService.hasAdminPortalAccess(
        session.user.id,
        session.user.email
      ));

    if (!hasAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    // =========================================================================
    // JSON ACTION DISPATCHER
    // =========================================================================
    if (contentType.includes("application/json")) {
      const body = await request.json();

      // -----------------------------------------------------------------------
      // ACTION: PRESIGN (Direct-to-R2 Browser Upload)
      // -----------------------------------------------------------------------
      if (body.action === "presign") {
        const {
          appSlug,
          fileName,
          fileSize,
          sha256,
          packageName,
          versionName,
          versionCode,
          certificateFingerprint,
        } = body;

        if (!appSlug || !fileName || !fileSize || !sha256 || !packageName || !versionCode) {
          return NextResponse.json(
            { error: "Missing required fields for presigned upload request" },
            { status: 400 }
          );
        }

        if (fileSize < 1024 * 1024) {
          return NextResponse.json(
            { error: "File is too small to be a valid Android APK (less than 1 MB)" },
            { status: 400 }
          );
        }
        if (fileSize > 200 * 1024 * 1024) {
          return NextResponse.json(
            { error: "File exceeds maximum supported APK size (200 MB)" },
            { status: 400 }
          );
        }

        const app = await prisma.publishedApp.findFirst({
          where: { OR: [{ slug: appSlug }, { packageName }] },
          include: {
            versions: {
              where: { isPublished: true },
              orderBy: { versionCode: "desc" },
            },
          },
        });

        if (!app) {
          return NextResponse.json(
            { error: `Application '${appSlug}' not found` },
            { status: 404 }
          );
        }

        if (app.packageName !== packageName) {
          return NextResponse.json(
            { error: `Package name mismatch: uploaded APK is '${packageName}', but expected '${app.packageName}'` },
            { status: 400 }
          );
        }

        // Verify update integrity
        const latestRelease = app.versions[0];
        const updateCheck = ApkValidator.verifyApkUpdate(
          {
            packageName: app.packageName,
            latestCertFingerprint: latestRelease?.certificateFingerprint || null,
            latestVersionCode: latestRelease?.versionCode ?? null,
          },
          {
            isValid: true,
            fileSize,
            sha256,
            packageName,
            versionName,
            versionCode: Number(versionCode),
            certificateFingerprint,
          }
        );

        if (!updateCheck.valid) {
          return NextResponse.json(
            { error: updateCheck.reason || "APK security verification failed" },
            { status: 400 }
          );
        }

        // Generate canonical R2 object key
        const storageKey = r2ReleaseStorage.generateReleaseObjectKey(
          app.slug,
          versionName,
          Number(versionCode),
          sha256,
          fileName
        );
        const apkFileName = path.basename(storageKey);

        const uploadUrl = await r2ReleaseStorage.getPresignedUploadUrl(
          storageKey,
          "application/vnd.android.package-archive",
          3600
        );

        return NextResponse.json({
          success: true,
          action: "presign",
          uploadUrl,
          storageKey,
          apkFileName,
          appSlug: app.slug,
          compatibilityWarning: updateCheck.warning || null,
          hasCompatibilityWarning: Boolean(updateCheck.hasCompatibilityWarning),
        });
      }

      // -----------------------------------------------------------------------
      // ACTION: VERIFY (Confirm binary uploaded to R2)
      // -----------------------------------------------------------------------
      if (body.action === "verify") {
        const { storageKey, expectedSize, expectedSha256 } = body;

        if (!storageKey) {
          return NextResponse.json({ error: "Missing storageKey for verification" }, { status: 400 });
        }

        const head = await r2ReleaseStorage.headReleaseObject(storageKey);
        if (!head.exists) {
          return NextResponse.json(
            { error: "Binary not found in Cloudflare R2 storage. Upload may still be in progress." },
            { status: 400 }
          );
        }

        if (expectedSize && head.contentLength !== Number(expectedSize)) {
          return NextResponse.json(
            {
              error: `Uploaded binary size mismatch. Expected ${expectedSize} bytes, got ${head.contentLength} bytes.`,
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: "verify",
          verified: true,
          storageKey,
          contentLength: head.contentLength,
          storageProvider: "R2",
        });
      }

      // -----------------------------------------------------------------------
      // ACTION: ACCEPTANCE_CHECK (Automated test of binary and release record)
      // -----------------------------------------------------------------------
      if (body.action === "acceptance_check") {
        const { releaseId } = body;
        if (!releaseId) {
          return NextResponse.json({ error: "Missing releaseId for acceptance check" }, { status: 400 });
        }

        const result = await AppsService.runReleaseAcceptanceCheck(releaseId);
        return NextResponse.json(result);
      }

      // -----------------------------------------------------------------------
      // ACTION: ROLLBACK (Atomically update active version pointer)
      // -----------------------------------------------------------------------
      if (body.action === "rollback") {
        const { appSlug, releaseId } = body;
        if (!appSlug || !releaseId) {
          return NextResponse.json({ error: "Missing appSlug or releaseId for rollback" }, { status: 400 });
        }
        const { ReleasePublishingService } = await import("@/lib/services/apps/publisher");
        const result = await ReleasePublishingService.rollbackToRelease(appSlug, releaseId);
        return NextResponse.json(result);
      }

      // -----------------------------------------------------------------------
      // ACTION: PUBLISH_R2 (Finalize and register R2 uploaded release)
      // -----------------------------------------------------------------------
      if (body.action === "publish_r2") {
        const { ReleasePublishingService } = await import("@/lib/services/apps/publisher");
        const result = await ReleasePublishingService.publishFromR2Storage(body);
        return NextResponse.json(result);
      }

      // -----------------------------------------------------------------------
      // MODE A: STANDARD LIGHTWEIGHT JSON INSPECTION VERIFICATION
      // -----------------------------------------------------------------------
      const {
        appSlug,
        fileName,
        fileSize,
        sha256,
        packageName,
        versionName,
        versionCode,
        minSdkVersion,
        targetSdkVersion,
        certificateFingerprint,
        manifestBase64,
        certificateBase64,
        storageKey: providedStorageKey,
      } = body;

      if (!fileName || !fileSize || !sha256 || !packageName || !versionCode) {
        return NextResponse.json(
          { error: "Missing required APK inspection metadata in verification payload" },
          { status: 400 }
        );
      }

      // Check file size limits: min 1MB, max 200MB
      if (fileSize < 1024 * 1024) {
        return NextResponse.json(
          { error: "File is too small to be a valid Android APK (less than 1 MB)" },
          { status: 400 }
        );
      }
      if (fileSize > 200 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File exceeds maximum supported APK size (200 MB)" },
          { status: 400 }
        );
      }

      // Cryptographic verification of manifest proof if provided
      if (manifestBase64) {
        try {
          const manifestBuf = Buffer.from(manifestBase64, "base64");
          const parsed = parseAxml(manifestBuf);
          if (parsed) {
            if (parsed.packageName && parsed.packageName !== packageName) {
              return NextResponse.json(
                { error: `Cryptographic proof mismatch: manifest package (${parsed.packageName}) does not match submitted package (${packageName})` },
                { status: 400 }
              );
            }
            if (parsed.versionCode && parsed.versionCode !== versionCode) {
              return NextResponse.json(
                { error: `Cryptographic proof mismatch: manifest versionCode (${parsed.versionCode}) does not match submitted versionCode (${versionCode})` },
                { status: 400 }
              );
            }
          }
        } catch (e: any) {
          console.warn("[Upload Route] Manifest proof decode warning:", e);
        }
      }

      // Cryptographic verification of certificate proof if provided
      if (certificateBase64 && certificateFingerprint) {
        try {
          const certBuf = Buffer.from(certificateBase64, "base64");
          const computedFp = crypto.createHash("sha256").update(certBuf).digest("hex").toLowerCase();
          if (computedFp !== certificateFingerprint.toLowerCase()) {
            return NextResponse.json(
              { error: "Cryptographic proof mismatch: signing certificate SHA-256 fingerprint does not match certificate proof" },
              { status: 400 }
            );
          }
        } catch (e: any) {
          console.warn("[Upload Route] Certificate proof decode warning:", e);
        }
      }

      let updateVerification: { valid: boolean; reason?: string; hasCompatibilityWarning?: boolean; warning?: string } | null = null;
      let matchingRelease: any = null;

      // Verify against database invariants if target application is specified
      let resolvedAppSlug = appSlug || "member-app";
      if (appSlug || packageName) {
        const app = await prisma.publishedApp.findFirst({
          where: {
            OR: [
              ...(appSlug ? [{ slug: appSlug }] : []),
              ...(packageName ? [{ packageName }] : []),
            ],
          },
          include: {
            versions: {
              where: { isPublished: true },
              orderBy: { versionCode: "desc" },
            },
          },
        });

        if (app) {
          resolvedAppSlug = app.slug;
          const latestRelease = app.versions[0];
          matchingRelease = app.versions.find((v) => v.versionCode === Number(versionCode)) || null;

          updateVerification = ApkValidator.verifyApkUpdate(
            {
              packageName: app.packageName,
              latestCertFingerprint: latestRelease?.certificateFingerprint || null,
              latestVersionCode: latestRelease?.versionCode ?? null,
            },
            {
              isValid: true,
              fileSize,
              sha256,
              packageName,
              versionName,
              versionCode: Number(versionCode),
              certificateFingerprint,
            }
          );

          if (!updateVerification.valid) {
            return NextResponse.json(
              { error: updateVerification.reason || "APK security verification failed" },
              { status: 400 }
            );
          }
        }
      }

      // Generate canonical R2 storage key and filename
      const storageKey =
        providedStorageKey ||
        r2ReleaseStorage.generateReleaseObjectKey(
          resolvedAppSlug,
          versionName,
          Number(versionCode),
          sha256,
          fileName
        );
      const uniqueFileName = path.basename(storageKey);
      const downloadEndpointUrl = `/api/apps/${resolvedAppSlug}/download`;

      return NextResponse.json({
        success: true,
        inspection: {
          isValid: true,
          fileSize,
          sha256,
          packageName,
          versionName: versionName || "1.0.0",
          versionCode: Number(versionCode),
          minSdkVersion: minSdkVersion || "Android 10 (API 29)",
          targetSdkVersion: targetSdkVersion || 36,
          certificateFingerprint,
          apkFileName: uniqueFileName,
          apkUrl: downloadEndpointUrl,
          storageKey,
          storageProvider: "R2",
        },
        compatibilityWarning: updateVerification?.warning || null,
        hasCompatibilityWarning: Boolean(updateVerification?.hasCompatibilityWarning),
        matchingRelease: matchingRelease
          ? {
              id: matchingRelease.id,
              versionName: matchingRelease.versionName,
              versionCode: matchingRelease.versionCode,
              apkFileName: matchingRelease.apkFileName,
              sha256: matchingRelease.sha256,
              releasedAt: matchingRelease.releasedAt,
            }
          : null,
      });
    }

    // =========================================================================
    // MODE B: MULTIPART FORM UPLOAD (With Persistent R2 Upload)
    // =========================================================================
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetAppSlug = formData.get("appSlug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const originalName = file.name || "app-release.apk";
    if (!originalName.toLowerCase().endsWith(".apk")) {
      return NextResponse.json(
        { error: "Invalid file type. Only Android APK (.apk) files are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Inspect APK buffer in-memory
    const inspection = ApkValidator.inspectApk(buffer);
    if (!inspection.isValid) {
      return NextResponse.json(
        { error: `APK validation failed: ${inspection.error || "Corrupted or invalid APK"}` },
        { status: 400 }
      );
    }

    let updateCheck: { valid: boolean; reason?: string; hasCompatibilityWarning?: boolean; warning?: string } | null = null;
    let matchingRelease: any = null;
    let resolvedSlug = targetAppSlug || (inspection.packageName?.includes("employee") ? "employee-app" : "member-app");

    // Verify against target app invariants if slug provided
    if (targetAppSlug || inspection.packageName) {
      const app = await prisma.publishedApp.findFirst({
        where: {
          OR: [
            ...(targetAppSlug ? [{ slug: targetAppSlug }] : []),
            ...(inspection.packageName ? [{ packageName: inspection.packageName }] : []),
          ],
        },
        include: {
          versions: {
            where: { isPublished: true },
            orderBy: { versionCode: "desc" },
          },
        },
      });

      if (app) {
        resolvedSlug = app.slug;
        const latest = app.versions[0];
        matchingRelease = app.versions.find((v) => v.versionCode === Number(inspection.versionCode)) || null;

        updateCheck = ApkValidator.verifyApkUpdate(
          {
            packageName: app.packageName,
            latestCertFingerprint: latest?.certificateFingerprint || null,
            latestVersionCode: latest?.versionCode ?? null,
          },
          inspection
        );

        if (!updateCheck.valid) {
          return NextResponse.json(
            { error: updateCheck.reason || "APK security verification failed" },
            { status: 400 }
          );
        }
      }
    }

    // Generate canonical R2 object key
    const storageKey = r2ReleaseStorage.generateReleaseObjectKey(
      resolvedSlug,
      inspection.versionName || "1.0.0",
      Number(inspection.versionCode || 1),
      inspection.sha256,
      originalName
    );
    const safeName = path.basename(storageKey);
    const downloadEndpointUrl = `/api/apps/${resolvedSlug}/download`;

    // Upload to Cloudflare R2 persistent storage
    if (r2ReleaseStorage.isConfigured()) {
      try {
        await r2ReleaseStorage.putReleaseObject(storageKey, buffer, {
          sha256: inspection.sha256,
          packageName: inspection.packageName || "",
          versionCode: String(inspection.versionCode || 1),
          versionName: inspection.versionName || "",
        });
      } catch (r2Err: any) {
        console.error("[Upload Route] Failed to upload to Cloudflare R2:", r2Err);
        return NextResponse.json(
          { error: `Failed to persist binary to Cloudflare R2 storage: ${r2Err.message}` },
          { status: 500 }
        );
      }
    }

    // Safely attempt to write to disk if filesystem is writable (catch read-only errors on serverless)
    try {
      const downloadsDir = path.join(process.cwd(), "public", "downloads", "apps");
      if (!fs.existsSync(/*turbopackIgnore: true*/ downloadsDir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ downloadsDir, { recursive: true });
      }
      const filePath = path.join(downloadsDir, safeName);
      fs.writeFileSync(/*turbopackIgnore: true*/ filePath, buffer);
    } catch (fsErr: any) {
      console.warn("[Upload Route] Safe fallback: local disk write skipped on read-only runtime:", fsErr?.message);
    }

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        apkFileName: safeName,
        apkUrl: downloadEndpointUrl,
        storageKey,
        storageProvider: "R2",
      },
      compatibilityWarning: updateCheck?.warning || null,
      hasCompatibilityWarning: Boolean(updateCheck?.hasCompatibilityWarning),
      matchingRelease: matchingRelease
        ? {
            id: matchingRelease.id,
            versionName: matchingRelease.versionName,
            versionCode: matchingRelease.versionCode,
            apkFileName: matchingRelease.apkFileName,
            sha256: matchingRelease.sha256,
            releasedAt: matchingRelease.releasedAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[POST /api/admin/apps/upload] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
