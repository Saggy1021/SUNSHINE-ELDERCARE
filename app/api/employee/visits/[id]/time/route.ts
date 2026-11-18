import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import {
  careVisitEmployeeIncludes,
  formatEmployeeVisit,
  formatTime12HourIST,
  formatDateIST,
} from "@/lib/services/employee-visit-formatter";

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

export async function PATCH(
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
        { success: false, error: "Access denied. You can only update visits assigned to you." },
        { status: 403 }
      );
    }

    let parsedArrival: Date | null | undefined = undefined;
    let parsedDeparture: Date | null | undefined = undefined;

    if (body.clearArrival === true) {
      parsedArrival = null;
    } else if (
      body.actualArrival !== undefined &&
      body.actualArrival !== null &&
      typeof body.actualArrival === "string" &&
      body.actualArrival.trim() !== ""
    ) {
      const d = parseToDate(body.actualArrival, visit.scheduledStart);
      if (!d) {
        return NextResponse.json(
          { success: false, error: "Invalid actual arrival date format." },
          { status: 400 }
        );
      }
      parsedArrival = d;
    }

    if (body.clearDeparture === true) {
      parsedDeparture = null;
    } else if (
      body.actualDeparture !== undefined &&
      body.actualDeparture !== null &&
      typeof body.actualDeparture === "string" &&
      body.actualDeparture.trim() !== ""
    ) {
      const d = parseToDate(body.actualDeparture, visit.scheduledStart);
      if (!d) {
        return NextResponse.json(
          { success: false, error: "Invalid actual departure date format." },
          { status: 400 }
        );
      }
      parsedDeparture = d;
    }

    // Determine the effective arrival and departure to validate chronological order
    const effectiveArrival = parsedArrival !== undefined ? parsedArrival : visit.actualStart;
    const effectiveDeparture = parsedDeparture !== undefined ? parsedDeparture : visit.actualEnd;

    if (effectiveArrival && effectiveDeparture) {
      if (effectiveDeparture.getTime() < effectiveArrival.getTime()) {
        return NextResponse.json(
          {
            success: false,
            error: "Actual departure time cannot be earlier than actual arrival time.",
          },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: any = {};
    if (parsedArrival !== undefined) dataToUpdate.actualStart = parsedArrival;
    if (parsedDeparture !== undefined) dataToUpdate.actualEnd = parsedDeparture;

    // Transition to IN_PROGRESS if arrival recorded and currently SCHEDULED
    if (effectiveArrival && visit.status === "SCHEDULED") {
      dataToUpdate.status = "IN_PROGRESS";
    }

    const updated = await db.careVisit.update({
      where: { id },
      data: dataToUpdate,
      include: careVisitEmployeeIncludes,
    });

    return NextResponse.json({
      success: true,
      message: "Actual visit timing updated successfully.",
      visit: formatEmployeeVisit(updated),
      actual: {
        arrival: updated.actualStart ? updated.actualStart.toISOString() : null,
        departure: updated.actualEnd ? updated.actualEnd.toISOString() : null,
        arrivalDisplay: updated.actualStart ? formatTime12HourIST(updated.actualStart) : null,
        departureDisplay: updated.actualEnd ? formatTime12HourIST(updated.actualEnd) : null,
        arrivalDateDisplay: updated.actualStart ? formatDateIST(updated.actualStart) : null,
        departureDateDisplay: updated.actualEnd ? formatDateIST(updated.actualEnd) : null,
      },
      status: updated.status,
    });
  } catch (error: any) {
    console.error("[update-actual-time] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
