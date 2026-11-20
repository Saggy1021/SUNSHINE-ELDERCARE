import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { EmergencyService } from "@/lib/services/emergency";
import { db } from "@/lib/db";

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
    const body = await req.json().catch(() => ({}));
    const incidentId = body.incidentId?.trim();

    if (!incidentId) {
      return NextResponse.json(
        { success: false, error: "Incident ID is required" },
        { status: 400 }
      );
    }

    // Verify incident is assigned to this employee
    const incident = await db.emergencyIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: "Incident not found" },
        { status: 404 }
      );
    }

    if (incident.assignedEmployeeId !== employee.id) {
      return NextResponse.json(
        { success: false, error: "You are not assigned to this incident" },
        { status: 403 }
      );
    }

    const updated = await EmergencyService.recordArrival({
      incidentId,
      actorId: employee.id,
      actorName: employee.name,
      notes: body.notes || `Arrival recorded by ${employee.name} via Employee App`,
    });

    return NextResponse.json({
      success: true,
      message: "Arrival on scene recorded successfully",
      status: updated.status,
      responderArrivedAt: updated.responderArrivedAt,
    });
  } catch (error: any) {
    console.error("[EMPLOYEE_EMERGENCY_ARRIVAL_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record arrival" },
      { status: 500 }
    );
  }
}
