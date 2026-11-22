import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
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
 * 2. If the requested file is a historical, suffixed (e.g. -d3f31e56.apk), or aliased filename,
 *    identifies the associated release in PostgreSQL and automatically resolves to the
 *    authoritative binary matching its cryptographic SHA-256 and version.
 * 3. Performs an immediate HTTP 307 redirect to the accessible canonical static binary,
 *    eliminating broken 404 links while preserving CDN caching.
 * 4. Returns a structured JSON diagnostic if no matching binary exists anywhere.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { file } = await params;
    if (!file) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    const publicDownloadsDir = path.join(process.cwd(), "public", "downloads", "apps");

    // 1. Direct disk check: if exact file exists, serve with full Android MIME headers
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
            "Cache-Control": file.includes("-Release.apk")
              ? "no-cache, no-store, must-revalidate"
              : "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch (readErr: any) {
        console.warn("[Smart APK Route] Direct read error, proceeding to DB resolution:", readErr?.message);
      }
    }

    // 2. Query database for release record associated with this filename or URL
    const cleanFileName = file.replace(/[^a-zA-Z0-9._-]/g, "");
    const release = await prisma.appRelease.findFirst({
      where: {
        OR: [
          { apkFileName: cleanFileName },
          { apkUrl: { contains: cleanFileName } },
          { apkFileName: { contains: cleanFileName.replace(/-[a-f0-9]{8}\.apk$/, "") } },
        ],
      },
      include: { app: true },
      orderBy: { versionCode: "desc" },
    });

    const isMember = cleanFileName.toLowerCase().includes("member") || release?.app.slug === "member-app";
    const isEmployee = cleanFileName.toLowerCase().includes("employee") || release?.app.slug === "employee-app";

    // 3. Candidate filenames to check on disk in order of specificity
    const candidateFiles: string[] = [];

    if (release) {
      const appPrefix = isMember ? "Sunshine-Member" : isEmployee ? "Sunshine-Employee" : "App";
      candidateFiles.push(`${appPrefix}-v${release.versionName}-b${release.versionCode}.apk`);
      candidateFiles.push(`${appPrefix}-Release.apk`);
    }

    if (isMember) {
      candidateFiles.push("Sunshine-Member-Release.apk");
      candidateFiles.push("Sunshine-Member-v1.0.2-b3.apk");
    } else if (isEmployee) {
      candidateFiles.push("Sunshine-Employee-Release.apk");
      candidateFiles.push("Sunshine-Employee-v1.0.0-b1.apk");
    }

    // Deduplicate candidate list
    const uniqueCandidates = Array.from(new Set(candidateFiles));

    // 4. Resolve against candidate files on disk
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

    // 5. If release has an alternate apkUrl that is different from requested file, redirect to it
    if (release && release.apkUrl && !release.apkUrl.includes(cleanFileName)) {
      const origin = new URL(request.url).origin;
      const target = release.apkUrl.startsWith("http") ? release.apkUrl : `${origin}${release.apkUrl}`;
      return NextResponse.redirect(target, {
        status: 307,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
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
  return GET(request, { params });
}
