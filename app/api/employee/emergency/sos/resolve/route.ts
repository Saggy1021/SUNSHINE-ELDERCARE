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
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { incidentId, notes } = body;

    // Find the emergency incident
    let incident = null;
    if (incidentId) {
      incident = await db.emergencyIncident.findUnique({
        where: { id: incidentId },
      });
    }

    if (!incident) {
      // Find latest active incident belonging to this staff member
      incident = await db.emergencyIncident.findFirst({
        where: {
          OR: [
            { memberId: `STAFF - ${employee.employeeId}` },
            { triggerNotes: { contains: employee.employeeId } },
          ],
          status: { in: ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"] },
        },
        orderBy: { triggeredAt: "desc" },
      });
    }

    if (!incident) {
      return NextResponse.json(
        { success: false, error: "No active emergency incident found for this employee." },
        { status: 404 }
      );
    }

    // Security check: Must not allow an employee to resolve an incident belonging to another person
    const isStaffOwner =
      incident.memberId === `STAFF - ${employee.employeeId}` ||
      (incident.triggerNotes && incident.triggerNotes.includes(employee.employeeId));

    if (!isStaffOwner) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Cannot resolve an emergency incident belonging to another person." },
        { status: 403 }
      );
    }

    // If already closed, return idempotent success
    if (incident.status === "RESOLVED" || incident.status === "CANCELLED") {
      return NextResponse.json({
        success: true,
        alreadyResolved: true,
        incidentId: incident.id,
        incidentNumber: incident.incidentNumber,
        status: incident.status,
        message: "Emergency incident is already resolved.",
      });
    }

    // Resolve through authoritative EmergencyOS workflow
    const resolvedNotes =
      notes && notes.trim().length >= 5
        ? notes.trim()
        : `Field staff member ${employee.firstName} ${employee.lastName} (${employee.employeeId}) confirmed safety via Employee App ('I Am Safe / End Emergency'). Incident closed.`;

    const updated = await EmergencyService.resolveIncident({
      incidentId: incident.id,
      resolutionNotes: resolvedNotes,
      actorId: employee.userId || employee.id,
      actorName: `${employee.firstName} ${employee.lastName} (Field Staff)`.trim(),
    });

    return NextResponse.json({
      success: true,
      resolved: true,
      incidentId: updated.id,
      incidentNumber: updated.incidentNumber,
      status: updated.status,
      message: "Emergency resolved successfully. Safety confirmed.",
    });
  } catch (error: any) {
    console.error("[EMPLOYEE_SOS_RESOLVE_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve employee emergency" },
      { status: 500 }
    );
  }
}
