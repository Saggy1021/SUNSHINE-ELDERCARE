import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthenticatedMember } from "@/lib/auth/member-auth";
import { EmergencyService, EmergencyTriggerSource } from "@/lib/services/emergency";

export async function POST(req: NextRequest) {
  try {
    // 1. Check for authenticated member via Bearer token (Member App)
    const memberAuth = await getAuthenticatedMember(req);
    // 2. Check for web NextAuth session (EmergencyOS / Website)
    const session = await auth();

    const body = await req.json().catch(() => ({}));

    let userId: string | null = null;
    let memberId: string | null = null;
    let callerName: string | null = null;
    let callerPhone: string | null = null;
    let fallbackAddress: string | null = null;
    let triggerSource: EmergencyTriggerSource = "MEMBER_APP_SOS";

    if (memberAuth.authenticated && memberAuth.member) {
      userId = memberAuth.member.id;
      memberId = memberAuth.member.memberId;
      callerName = memberAuth.member.name;
      callerPhone = memberAuth.member.phone;
      fallbackAddress = memberAuth.member.serviceAddress;
      triggerSource = "MEMBER_APP_SOS";
    } else if (session?.user?.id) {
      userId = session.user.id;
      callerName = session.user.name || null;
      triggerSource = body.triggerSource || "WEB_SOS";
      memberId = body.memberId || null;
      callerPhone = body.callerPhone || null;
      fallbackAddress = body.fallbackAddress || null;
    } else {
      userId = body.userId || null;
      memberId = body.memberId || null;
      callerName = body.callerName || null;
      callerPhone = body.callerPhone || null;
      fallbackAddress = body.fallbackAddress || null;
      triggerSource = body.triggerSource || "MEMBER_APP_SOS";
    }

    const incident = await EmergencyService.createIncident({
      userId,
      memberId,
      callerName,
      callerPhone,
      triggerSource,
      triggerNotes: body.notes || body.triggerNotes || null,
      latitude: typeof body.latitude === "number" ? body.latitude : null,
      longitude: typeof body.longitude === "number" ? body.longitude : null,
      accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
      fallbackAddress,
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
