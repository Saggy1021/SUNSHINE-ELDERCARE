import { NextRequest, NextResponse } from "next/server";
import { AppsService } from "@/lib/services/apps";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Public download endpoint for published Sunshine application APKs.
 * Accessible without login so members, employees, and elder-care families
 * can directly download official APKs to their Android devices.
 *
 * Automatically records download telemetry and performs a 307 redirect
 * to the verified, CDN-served APK binary.
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

    // Telemetry: record download asynchronously (fire-and-forget)
    AppsService.recordDownload(app.latestRelease.id).catch(() => {});

    // Compute redirect target
    const targetUrl = app.latestRelease.apkUrl.startsWith("http")
      ? app.latestRelease.apkUrl
      : `${new URL(request.url).origin}${app.latestRelease.apkUrl}`;

    return NextResponse.redirect(targetUrl, {
      status: 307,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Disposition": `attachment; filename="${app.latestRelease.apkFileName}"`,
        "Content-Type": "application/vnd.android.package-archive",
      },
    });
  } catch (error: any) {
    console.error(`[GET /api/apps/[slug]/download] Error:`, error);
    return NextResponse.json(
      { error: "Failed to process APK download" },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest, { params }: RouteParams) {
  return GET(request, { params });
}
