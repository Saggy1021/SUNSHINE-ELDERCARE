import { NextRequest, NextResponse } from "next/server";
import { AppsService } from "@/lib/services/apps";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Public, read-only endpoint returning update manifest for a specific application by slug or package name.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Application slug is required" }, { status: 400 });
    }

    const manifest = await AppsService.getUpdateManifest(slug);
    if (!manifest) {
      return NextResponse.json(
        { error: `Application '${slug}' not found or has no published releases` },
        { status: 404 }
      );
    }

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error(`[GET /api/apps/[slug]/manifest] Error:`, error);
    return NextResponse.json(
      { error: "Failed to load update manifest" },
      { status: 500 }
    );
  }
}
