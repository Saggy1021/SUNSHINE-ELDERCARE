import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import {
  careVisitEmployeeIncludes,
  formatEmployeeVisit,
  formatEmergencyIncidentAsVisit,
} from "@/lib/services/employee-visit-formatter";

// Get Asia/Kolkata today boundary
function getTodayISTBoundaries() {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = istFormatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  // IST is UTC+5:30
  // Midnight IST in UTC is 18:30 UTC of previous day
  const startOfDayIST = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  const endOfDayIST = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);
  return { startOfDayIST, endOfDayIST };
}

export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedEmployee(req);
    if (!authResult.authenticated || !authResult.employee) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const employee = authResult.employee;
    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all";

    const { startOfDayIST, endOfDayIST } = getTodayISTBoundaries();
    const now = new Date();

    const where: any = {
      OR: [
        { assignedEmpId: employee.id },
        { assignments: { some: { employeeId: employee.id } } },
      ],
    };

    if (filter === "today") {
      where.scheduledStart = {
        gte: startOfDayIST,
        lte: endOfDayIST,
      };
    } else if (filter === "upcoming") {
      where.scheduledStart = { gt: now };
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
    } else if (filter === "completed") {
      where.status = "COMPLETED";
    } else if (filter === "cancelled") {
      where.status = "CANCELLED";
    }

    // Query active emergency incidents assigned to this employee
    const emgWhere: any = {
      assignedEmployeeId: employee.id,
    };
    if (filter === "today" || filter === "upcoming" || filter === "all") {
      emgWhere.status = { in: ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"] };
    } else if (filter === "completed") {
      emgWhere.status = "RESOLVED";
    } else if (filter === "cancelled") {
      emgWhere.status = "CANCELLED";
    }

    const [visits, assignedIncidents] = await Promise.all([
      db.careVisit.findMany({
        where,
        orderBy: { scheduledStart: "asc" }, // Ascending chronological priority
        include: careVisitEmployeeIncludes,
      }),
      db.emergencyIncident.findMany({
        where: emgWhere,
        include: {
          user: {
            include: {
              memberProfile: true,
            },
          },
        },
        orderBy: { triggeredAt: "desc" },
      }),
    ]);

    const formattedVisits = visits.map((v) => formatEmployeeVisit(v));
    const formattedIncidents = assignedIncidents.map((inc) => formatEmergencyIncidentAsVisit(inc));

    // Emergency visits always take top operational priority
    const allVisits = [...formattedIncidents, ...formattedVisits];

    return NextResponse.json({
      success: true,
      filter,
      total: allVisits.length,
      count: allVisits.length,
      visits: allVisits,
    });
  } catch (error: any) {
    console.error("[get-employee-visits] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
