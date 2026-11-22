import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { r2ReleaseStorage } from "@/lib/services/storage/r2-releases";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ file: string }>;
}

/**
 * Smart Route Handler for /downloads/apps/[file]
 * 
 * Provides resilient, self-healing delivery for Sunshine application APKs:
 * 1. If the exact file exists on disk in public/downloads/apps/, serves it with correct
 *    Android package headers and content-length.
 * 2. If the requested file is stored in Cloudflare R2 persistent storage, generates a presigned
 *    CDN download URL and performs an immediate HTTP 307 redirect.
 * 3. If the requested file is a historical, suffixed (e.g. -d3f31e56.apk), or aliased filename,
 *    identifies the associated release in PostgreSQL and automatically resolves to the
 *    authoritative binary.
 * 4. Eliminates broken 404 links while preserving CDN caching.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { file } = await params;
    if (!file) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    const publicDownloadsDir = path.join(process.cwd(), "public", "downloads", "apps");
    const cleanFileName = file.replace(/[^a-zA-Z0-9._-]/g, "");

    // 1. Authoritative Release Query: resolve latest verified release from PostgreSQL
    const release = await prisma.appRelease.findFirst({
      where: {
        OR: [
          { apkFileName: cleanFileName },
          { apkUrl: { contains: cleanFileName } },
          { storageKey: { contains: cleanFileName } },
          { apkFileName: { contains: cleanFileName.replace(/-[a-f0-9]{8}\.apk$/, "") } },
        ],
      },
      include: { app: true },
      orderBy: { versionCode: "desc" },
    });

    const isMember = cleanFileName.toLowerCase().includes("member") || release?.app.slug === "member-app";
    const isEmployee = cleanFileName.toLowerCase().includes("employee") || release?.app.slug === "employee-app";

    // 2. Persistent Cloudflare R2 delivery: single authoritative source of truth
    if (release && (release.storageKey || release.storageProvider === "R2" || r2ReleaseStorage.isConfigured())) {
      const storageKey = release.storageKey || `releases/apps/${release.app.slug}/${release.apkFileName}`;
      const presignedUrl = await r2ReleaseStorage.getPresignedDownloadUrl(
        storageKey,
        release.apkFileName,
        3600
      );

      return NextResponse.redirect(presignedUrl, {
        status: 307,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": `attachment; filename="${release.apkFileName}"`,
        },
      });
    }

    // 3. Fallback for offline local dev environments only if R2 is not configured
    const directDiskPath = path.join(publicDownloadsDir, file);
    if (fs.existsSync(directDiskPath)) {
      try {
        const stat = fs.statSync(directDiskPath);
        const fileBuffer = fs.readFileSync(directDiskPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${file}"`,
            "Content-Length": stat.size.toString(),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch (readErr: any) {
        console.warn("[Smart APK Route] Direct read error, proceeding to candidate check:", readErr?.message);
      }
    }

    // 4. Candidate filenames to check on disk in order of specificity
    const candidateFiles: string[] = [];

    if (release) {
      const appPrefix = isMember ? "Sunshine-Member" : isEmployee ? "Sunshine-Employee" : "App";
      candidateFiles.push(`${appPrefix}-v${release.versionName}-b${release.versionCode}.apk`);
      candidateFiles.push(`${appPrefix}-Release.apk`);
    }

    if (isMember) {
      candidateFiles.push("Sunshine-Member-Release.apk");
      candidateFiles.push("Sunshine-Member-v1.0.5-b6.apk");
      candidateFiles.push("Sunshine-Member-v1.0.2-b3.apk");
    } else if (isEmployee) {
      candidateFiles.push("Sunshine-Employee-Release.apk");
      candidateFiles.push("Sunshine-Employee-v1.0.0-b1.apk");
    }

    const uniqueCandidates = Array.from(new Set(candidateFiles));

    for (const candidate of uniqueCandidates) {
      const candidatePath = path.join(publicDownloadsDir, candidate);
      if (fs.existsSync(candidatePath)) {
        const origin = new URL(request.url).origin;
        const resolvedUrl = `${origin}/downloads/apps/${candidate}`;
        return NextResponse.redirect(resolvedUrl, {
          status: 307,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${candidate}"`,
          },
        });
      }
    }

    // 5. Alternate URL fallback or redirect to canonical app download endpoint
    const origin = new URL(request.url).origin;
    if (release && release.apkUrl && !release.apkUrl.includes(cleanFileName)) {
      const target = release.apkUrl.startsWith("http") ? release.apkUrl : `${origin}${release.apkUrl}`;
      return NextResponse.redirect(target, {
        status: 307,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (isMember) {
      return NextResponse.redirect(`${origin}/api/apps/member-app/download`, {
        status: 307,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }

    if (isEmployee) {
      return NextResponse.redirect(`${origin}/api/apps/employee-app/download`, {
        status: 307,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }

    // 6. Explicit 404 with structured diagnostic details
    return NextResponse.json(
      {
        error: "APK binary not found",
        requestedFile: file,
        message: `The requested APK binary '${file}' is not available on this distribution node.`,
        appSlug: release?.app.slug || (isMember ? "member-app" : isEmployee ? "employee-app" : "unknown"),
        statusCode: 404,
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error(`[GET /downloads/apps/[file]] Error:`, error);
    return NextResponse.json(
      { error: "Failed to resolve APK binary", details: error?.message },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    const { file } = await params;
    if (!file) return new NextResponse(null, { status: 400 });

    const cleanFileName = file.replace(/[^a-zA-Z0-9._-]/g, "");
    const release = await prisma.appRelease.findFirst({
      where: {
        OR: [
          { apkFileName: cleanFileName },
          { apkUrl: { contains: cleanFileName } },
          { storageKey: { contains: cleanFileName } },
        ],
      },
      include: { app: true },
      orderBy: { versionCode: "desc" },
    });

    if (release) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Length": release.fileSize.toString(),
          "Content-Disposition": `attachment; filename="${release.apkFileName}"`,
          "Accept-Ranges": "bytes",
          "ETag": `"${release.sha256}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return GET(request, { params });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
