import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import {
  careVisitEmployeeIncludes,
  formatEmployeeVisit,
} from "@/lib/services/employee-visit-formatter";
import { MonthlyExcessHoursService } from "@/lib/services/monthly-excess-hours";

function parseToDate(input: string, baseDate: Date): Date | null {
  if (!input) return null;
  const direct = new Date(input);
  if (!isNaN(direct.getTime()) && input.includes("-")) {
    return direct;
  }

  const match = input.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();

    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;

    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = istFormatter.formatToParts(baseDate);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const isoString = `${year}-${month}-${day}T${pad(hour)}:${pad(minute)}:00+05:30`;
    const result = new Date(isoString);
    if (!isNaN(result.getTime())) return result;
  }

  return isNaN(direct.getTime()) ? null : direct;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedEmployee(req);
    if (!authResult.authenticated || !authResult.employee) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { id } = await params;
    const employee = authResult.employee;
    const body = await req.json().catch(() => ({}));

    const visit = await db.careVisit.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!visit) {
      return NextResponse.json(
        { success: false, error: "Visit not found." },
        { status: 404 }
      );
    }

    const isAssigned =
      visit.assignedEmpId === employee.id ||
      visit.assignments.some((a) => a.employeeId === employee.id);

    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: "Access denied. You can only complete visits assigned to you." },
        { status: 403 }
      );
    }

    if (visit.status === "COMPLETED" && visit.actualStart && visit.actualEnd && visit.completedAt) {
      return NextResponse.json({
        success: true,
        message: "This visit has already been marked as completed.",
        visit: formatEmployeeVisit(visit),
      });
    }

    // Resolve Arrival Time
    let arrivalDate = visit.actualStart;
    if (
      body.actualArrival !== undefined &&
      body.actualArrival !== null &&
      typeof body.actualArrival === "string" &&
      body.actualArrival.trim() !== ""
    ) {
      const d = parseToDate(body.actualArrival, visit.scheduledStart);
      if (d) arrivalDate = d;
    }

    if (!arrivalDate) {
      return NextResponse.json(
        { success: false, error: "Actual arrival time must be recorded before completing the visit." },
        { status: 400 }
      );
    }

    // Resolve Departure Time
    let departureDate = visit.actualEnd;
    if (
      body.actualDeparture !== undefined &&
      body.actualDeparture !== null &&
      typeof body.actualDeparture === "string" &&
      body.actualDeparture.trim() !== ""
    ) {
      const d = parseToDate(body.actualDeparture, visit.scheduledStart);
      if (d) departureDate = d;
    }

    if (!departureDate) {
      return NextResponse.json(
        { success: false, error: "Actual departure time must be recorded before completing the visit." },
        { status: 400 }
      );
    }

    // Validate Chronological Order
    if (departureDate.getTime() < arrivalDate.getTime()) {
      return NextResponse.json(
        { success: false, error: "Actual departure time cannot be earlier than actual arrival time." },
        { status: 400 }
      );
    }

    // Resolve Work Description
    let workDesc =
      (typeof body.workDescription === "string" ? body.workDescription.trim() : "") ||
      visit.workDescription?.trim() ||
      "";
    if (!workDesc) {
      return NextResponse.json(
        { success: false, error: "Please enter a description of work performed before completing the visit." },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db.careVisit.update({
      where: { id },
      data: {
        actualStart: arrivalDate,
        actualEnd: departureDate,
        workDescription: workDesc,
        status: "COMPLETED",
        completedAt: visit.completedAt || now,
        completedById: visit.completedById || employee.id,
      },
      include: careVisitEmployeeIncludes,
    });

    // Audit logging
    await db.auditLog.create({
      data: {
        actorUserId: employee.id,
        action: "CARE_VISIT_COMPLETED_BY_EMPLOYEE",
        entityType: "CareVisit",
        entityId: visit.id,
        metadata: {
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          scheduledStart: visit.scheduledStart.toISOString(),
          actualArrival: arrivalDate.toISOString(),
          actualDeparture: departureDate.toISOString(),
          completedAt: now.toISOString(),
          workDescriptionLength: workDesc.length,
        },
      },
    }).catch(() => {});

    // Reconcile monthly excess care hours statement for open month
    const targetDate = updated.scheduledStart || updated.actualStart || now;
    await MonthlyExcessHoursService.reconcileVisitMonth(targetDate).catch((e) => {
      console.error("[complete-visit] MonthlyExcessHours reconciliation error:", e);
    });

    return NextResponse.json({
      success: true,
      message: "Visit marked as completed successfully.",
      visit: formatEmployeeVisit(updated),
    });
  } catch (error: any) {
    console.error("[complete-visit] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
