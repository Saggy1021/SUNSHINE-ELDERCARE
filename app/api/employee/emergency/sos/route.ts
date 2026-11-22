import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { EmergencyService } from "@/lib/services/emergency";

export const dynamic = "force-dynamic";

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

    const incident = await EmergencyService.createIncident({
      idempotencyKey: idempotencyKey || `emp-sos-${employee.id}-${Date.now()}`,
      initialClassification: "CODE_RED",
      triggerSource: "EMPLOYEE_APP_SOS" as any,
      userId: employee.id, // Linked to employee identity
      memberId: `STAFF - ${employee.employeeId}`,
      callerName: `${employee.firstName} ${employee.lastName} (Field Staff)`.trim(),
      callerPhone: employee.contactNumber || null,
      fallbackAddress: `Field staff location (${employee.designation})`,
      triggerNotes: notes || `Field Emergency SOS initiated by staff member ${employee.firstName} ${employee.lastName} (${employee.employeeId}, ${employee.designation}).`,
      latitude: typeof latitude === "number" ? latitude : undefined,
      longitude: typeof longitude === "number" ? longitude : undefined,
      accuracy: typeof accuracy === "number" ? accuracy : undefined,
    });

    return NextResponse.json({
      success: true,
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
