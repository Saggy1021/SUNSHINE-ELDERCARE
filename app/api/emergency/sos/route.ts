import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { EmergencyService, EmergencyTriggerSource } from "@/lib/services/emergency";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));

    const triggerSource: EmergencyTriggerSource =
      body.triggerSource || (session?.user?.id ? "WEB_SOS" : "MEMBER_APP_SOS");

    const incident = await EmergencyService.createIncident({
      userId: session?.user?.id || body.userId || null,
      memberId: body.memberId || null,
      callerName: body.callerName || session?.user?.name || null,
      callerPhone: body.callerPhone || null,
      triggerSource,
      triggerNotes: body.notes || body.triggerNotes || null,
      latitude: typeof body.latitude === "number" ? body.latitude : null,
      longitude: typeof body.longitude === "number" ? body.longitude : null,
      accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
      fallbackAddress: body.fallbackAddress || null,
    });

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      status: incident.status,
      classification: incident.classification,
      emergencyHelpline: "03340585515",
      trackingActive: incident.trackingActive,
    });
  } catch (error: any) {
    console.error("[EMERGENCY_SOS_API_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to trigger SOS" },
      { status: 500 }
    );
  }
}
