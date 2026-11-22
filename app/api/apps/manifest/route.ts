import { NextRequest, NextResponse } from "next/server";
import { AppsService } from "@/lib/services/apps";

export const dynamic = "force-dynamic";

/**
 * Public, read-only endpoint returning update manifests for all published applications.
 * Can be accessed without authentication by the Member App, Employee App, or public clients.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || searchParams.get("package") || undefined;

    const manifest = await AppsService.getUpdateManifest(slug);
    if (!manifest) {
      return NextResponse.json(
        { error: "Application not found or has no published releases" },
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
    console.error("[GET /api/apps/manifest] Error:", error);
    return NextResponse.json(
      { error: "Failed to load update manifest" },
      { status: 500 }
    );
  }
}
