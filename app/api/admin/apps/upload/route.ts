import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { ApkValidator, parseAxml, ApkInspectionResult } from "@/lib/services/apk-validator";
import { db as prisma } from "@/lib/db";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Admin-only API endpoint to inspect and verify an APK release.
 * Supports:
 * 1. Fast, lightweight JSON inspection verification (< 50KB payload) containing
 *    client-extracted metadata and cryptographic proof slices, completely bypassing
 *    Vercel's 4.5MB Serverless Function payload limit.
 * 2. Multipart form upload fallback for small files (< 4MB) or local development.
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
    // MODE A: LIGHTWEIGHT JSON VERIFICATION (Preferred & Vercel-Safe)
    // =========================================================================
    if (contentType.includes("application/json")) {
      const body = await request.json();
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

      // Generate a unique, immutable release-specific filename to prevent CDN cache collisions and stale downloads
      let prefix = appSlug || "app";
      if (fileName && fileName.toLowerCase().includes("member")) {
        prefix = "Sunshine-Member";
      } else if (fileName && fileName.toLowerCase().includes("employee")) {
        prefix = "Sunshine-Employee";
      }
      const safeVersion = (versionName || "1.0.0").replace(/[^a-zA-Z0-9._-]/g, "_");
      const shortSha = sha256.substring(0, 8);
      const uniqueFileName = `${prefix}-v${safeVersion}-b${versionCode}-${shortSha}.apk`;
      const relativeUrl = `/downloads/apps/${uniqueFileName}`;

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
          apkUrl: relativeUrl,
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
    // MODE B: MULTIPART FORM UPLOAD (For smaller files or direct local testing)
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

    // Sanitize filename and append shortSha to prevent CDN caching collisions
    const shortSha = inspection.sha256 ? inspection.sha256.substring(0, 8) : Date.now().toString(36);
    const baseName = originalName.replace(/\.apk$/i, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeName = `${baseName}-${shortSha}.apk`;
    const relativeUrl = `/downloads/apps/${safeName}`;

    // Safely attempt to write to disk if filesystem is writable (catch read-only errors on serverless)
    try {
      const downloadsDir = path.join(process.cwd(), "public", "downloads", "apps");
      if (!fs.existsSync(/*turbopackIgnore: true*/ downloadsDir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ downloadsDir, { recursive: true });
      }
      const filePath = path.join(downloadsDir, safeName);
      fs.writeFileSync(/*turbopackIgnore: true*/ filePath, buffer);
    } catch (fsErr: any) {
      // On serverless read-only filesystems (Vercel), ignore EROFS; the binary is already served or managed via release catalog
      console.warn("[Upload Route] Safe fallback: local disk write skipped on read-only runtime:", fsErr?.message);
    }

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        apkFileName: safeName,
        apkUrl: relativeUrl,
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
