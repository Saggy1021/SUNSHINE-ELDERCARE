import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { EmergencyService } from "@/lib/services/emergency";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedEmployee(req);
    if (!auth.authenticated || !auth.employee) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const employee = auth.employee;

    // Check for any active emergency incident triggered by this staff member
    const activeIncident = await db.emergencyIncident.findFirst({
      where: {
        OR: [
          { memberId: `STAFF - ${employee.employeeId}` },
          { triggerNotes: { contains: employee.employeeId } },
        ],
        status: { in: ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"] },
      },
      orderBy: { triggeredAt: "desc" },
    });

    if (!activeIncident) {
      return NextResponse.json({
        success: true,
        hasActiveSos: false,
        incident: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasActiveSos: true,
      incidentId: activeIncident.id,
      incidentNumber: activeIncident.incidentNumber,
      status: activeIncident.status,
      classification: activeIncident.classification,
      incident: {
        id: activeIncident.id,
        incidentNumber: activeIncident.incidentNumber,
        status: activeIncident.status,
        classification: activeIncident.classification,
        triggeredAt: activeIncident.triggeredAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[EMPLOYEE_SOS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check employee SOS status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedEmployee(req);
    if (!auth.authenticated || !auth.employee) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const employee = auth.employee;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { latitude, longitude, accuracy, notes, idempotencyKey } = body;

    // Guard: Check if employee already has an active emergency incident
    const existingActive = await db.emergencyIncident.findFirst({
      where: {
        OR: [
          { memberId: `STAFF - ${employee.employeeId}` },
          { triggerNotes: { contains: employee.employeeId } },
        ],
        status: { in: ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"] },
      },
      orderBy: { triggeredAt: "desc" },
    });

    if (existingActive) {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        incidentId: existingActive.id,
        incidentNumber: existingActive.incidentNumber,
        status: existingActive.status,
        classification: existingActive.classification,
        incident: {
          id: existingActive.id,
          incidentNumber: existingActive.incidentNumber,
          status: existingActive.status,
          classification: existingActive.classification,
          triggeredAt: existingActive.triggeredAt.toISOString(),
        },
      }, { status: 200 });
    }

    // Create EmergencyOS incident
    // Note: userId MUST reference User.id (employee.userId) or be null to avoid foreign key violations.
    const incident = await EmergencyService.createIncident({
      idempotencyKey: idempotencyKey || `emp-sos-${employee.id}-${Date.now()}`,
      initialClassification: "CODE_RED",
      triggerSource: "EMPLOYEE_APP",
      userId: employee.userId || null,
      memberId: `STAFF - ${employee.employeeId}`,
      callerName: `${employee.firstName} ${employee.lastName} (Field Staff)`.trim(),
      callerPhone: employee.contactNumber || null,
      fallbackAddress: `Field staff location - ${employee.designation} (${employee.employeeId})`,
      triggerNotes: notes || `Field Emergency SOS initiated by staff member ${employee.firstName} ${employee.lastName} (${employee.employeeId}, ${employee.designation}).`,
      latitude: typeof latitude === "number" ? latitude : undefined,
      longitude: typeof longitude === "number" ? longitude : undefined,
      accuracy: typeof accuracy === "number" ? accuracy : undefined,
    });

    return NextResponse.json({
      success: true,
      alreadyActive: false,
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      status: incident.status,
      classification: incident.classification,
      incident: {
        id: incident.id,
        incidentNumber: incident.incidentNumber,
        status: incident.status,
        classification: incident.classification,
        triggeredAt: incident.triggeredAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[EMPLOYEE_SOS_TRIGGER_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to trigger employee emergency SOS" },
      { status: 500 }
    );
  }
}
