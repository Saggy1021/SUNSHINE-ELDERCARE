import { NextRequest, NextResponse } from "next/server";
import { EmergencyService } from "@/lib/services/emergency";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.incidentId) {
      return NextResponse.json(
        { error: "Missing incidentId parameter" },
        { status: 400 }
      );
    }

    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        { error: "Valid latitude and longitude numbers are required" },
        { status: 400 }
      );
    }

    const res = await EmergencyService.updateTelemetry({
      incidentId: body.incidentId,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
    });

    if (!res.found) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    if (!res.active) {
      // 410 Gone: Explicit signal to mobile/client that tracking is closed and MUST cease
      return NextResponse.json(
        {
          error: "Incident is resolved or tracking is terminated",
          trackingActive: false,
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      trackingActive: true,
    });
  } catch (error: any) {
    console.error("[EMERGENCY_TELEMETRY_API_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest telemetry" },
      { status: 500 }
    );
  }
}
