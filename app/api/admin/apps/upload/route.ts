import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { ApkValidator } from "@/lib/services/apk-validator";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Admin-only API endpoint to upload an APK file.
 * Performs real-time APK binary inspection, computes SHA-256 and signing identity,
 * saves the file to public/downloads/apps, and returns inspection metadata.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and authorize admin
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized: Please sign in" }, { status: 401 });
    }

    const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
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

    // 2. Parse multipart form data
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

    // 3. Inspect and validate APK structure
    const inspection = ApkValidator.inspectApk(buffer);
    if (!inspection.isValid) {
      return NextResponse.json(
        { error: `APK validation failed: ${inspection.error || "Corrupted or invalid APK"}` },
        { status: 400 }
      );
    }

    // 4. Save file to disk in public/downloads/apps
    const downloadsDir = path.join(process.cwd(), "public", "downloads", "apps");
    if (!fs.existsSync(/*turbopackIgnore: true*/ downloadsDir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ downloadsDir, { recursive: true });
    }

    // Sanitize filename
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(downloadsDir, safeName);
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, buffer);

    const relativeUrl = `/downloads/apps/${safeName}`;

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        apkFileName: safeName,
        apkUrl: relativeUrl,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/admin/apps/upload] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
