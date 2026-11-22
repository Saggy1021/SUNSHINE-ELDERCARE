import { NextRequest, NextResponse } from "next/server";
import { AppsService } from "@/lib/services/apps";
import { r2ReleaseStorage } from "@/lib/services/storage/r2-releases";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string; filename?: string }>;
}

/**
 * Public download endpoint for published Sunshine application APKs.
 * Accessible without login so members, employees, and elder-care families
 * can directly download official APKs to their Android devices.
 *
 * Automatically records download telemetry and performs a 307 redirect
 * to the verified, CDN-served APK binary in Cloudflare R2 persistent storage.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Application slug required" }, { status: 400 });
    }

    const app = await AppsService.getPublishedAppBySlug(slug);
    if (!app || !app.latestRelease) {
      return NextResponse.json(
        { error: `No published release found for application '${slug}'` },
        { status: 404 }
      );
    }

    const release = app.latestRelease;

    // Telemetry: record download asynchronously (fire-and-forget)
    AppsService.recordDownload(release.id).catch(() => {});

    // 1. Authoritative Cloudflare R2 delivery: generate presigned download URL
    if (release.storageKey || release.storageProvider === "R2") {
      const storageKey = release.storageKey || `releases/apps/${app.slug}/${release.apkFileName}`;
      const presignedUrl = await r2ReleaseStorage.getPresignedDownloadUrl(
        storageKey,
        release.apkFileName,
        3600
      );

      return NextResponse.redirect(presignedUrl, {
        status: 307,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Disposition": `attachment; filename="${release.apkFileName}"`,
          "Content-Type": "application/vnd.android.package-archive",
        },
      });
    }

    // 2. Direct external HTTP download fallback
    if (release.apkUrl && release.apkUrl.startsWith("http")) {
      return NextResponse.redirect(release.apkUrl, {
        status: 307,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Disposition": `attachment; filename="${release.apkFileName}"`,
          "Content-Type": "application/vnd.android.package-archive",
        },
      });
    }

    // 3. Local disk fallback for local development environments
    const origin = new URL(request.url).origin;
    const targetUrl = AppsService.resolveAuthoritativeDownloadUrl(release, app);
    return NextResponse.redirect(targetUrl.startsWith("http") ? targetUrl : `${origin}${targetUrl}`, {
      status: 307,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Disposition": `attachment; filename="${release.apkFileName}"`,
        "Content-Type": "application/vnd.android.package-archive",
      },
    });
  } catch (error: any) {
    console.error(`[GET /api/apps/[slug]/download] Error:`, error);
    return NextResponse.json(
      { error: "Failed to process APK download", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Application slug required" }, { status: 400 });
    }
    const app = await AppsService.getPublishedAppBySlug(slug);
    if (!app || !app.latestRelease) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    await AppsService.recordDownload(app.latestRelease.id);
    return NextResponse.json({ success: true, recorded: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!slug) return new NextResponse(null, { status: 400 });

    const app = await AppsService.getPublishedAppBySlug(slug);
    if (!app || !app.latestRelease) {
      return new NextResponse(null, { status: 404 });
    }

    const release = app.latestRelease;
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
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
