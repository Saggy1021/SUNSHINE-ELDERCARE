import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { EmergencyService } from "@/lib/services/emergency";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await AuthorizationService.hasEmergencyAccess(
      session.user.id,
      session.user.email
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: EmergencyOS access required" },
        { status: 403 }
      );
    }

    const feed = await EmergencyService.getDashboardFeed();

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        ...feed,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[EMERGENCY_INCIDENTS_API_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
