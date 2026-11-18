import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";

// Format 12-hour IST time (e.g. "10:30 AM")
function formatTime12HourIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// Format IST date (e.g. "19 Nov 2026")
function formatDateIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

    const visits = await db.careVisit.findMany({
      where,
      orderBy: { scheduledStart: "asc" }, // Ascending chronological priority
      include: {
        careCase: {
          include: {
            elder: {
              include: {
                user: {
                  include: {
                    memberProfile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const formattedVisits = visits.map((v) => {
      const elder = v.careCase?.elder;
      const memberUser = elder?.user;
      const profile = memberUser?.memberProfile;

      // Primary member name with salutation
      const primaryName = [
        profile?.salutation?.trim(),
        profile?.firstName?.trim() || memberUser?.name,
        profile?.lastName?.trim(),
      ].filter(Boolean).join(" ").trim() || "Member";

      // Spouse full name with salutation, or "—"
      const hasSpouse = Boolean(
        profile?.spouseFirstName?.trim() || profile?.spouseLastName?.trim()
      );
      const spouseName = hasSpouse
        ? [
            profile?.spouseSalutation?.trim(),
            profile?.spouseFirstName?.trim(),
            profile?.spouseLastName?.trim(),
          ].filter(Boolean).join(" ").trim()
        : "—";

      return {
        id: v.id,
        status: v.status,
        member: {
          primaryName,
          spouseName,
          memberId: profile?.memberId || null,
          mobileNumber: profile?.mobileNumber || null,
          serviceAddress: profile?.serviceAddress || null,
        },
        scheduled: {
          start: v.scheduledStart.toISOString(),
          end: v.scheduledEnd.toISOString(),
          dateDisplay: formatDateIST(v.scheduledStart),
          timeDisplay: `${formatTime12HourIST(v.scheduledStart)} – ${formatTime12HourIST(v.scheduledEnd)}`,
          startTimeDisplay: formatTime12HourIST(v.scheduledStart),
          endTimeDisplay: formatTime12HourIST(v.scheduledEnd),
        },
        actual: {
          arrival: v.actualStart ? v.actualStart.toISOString() : null,
          departure: v.actualEnd ? v.actualEnd.toISOString() : null,
          arrivalDisplay: v.actualStart ? formatTime12HourIST(v.actualStart) : null,
          departureDisplay: v.actualEnd ? formatTime12HourIST(v.actualEnd) : null,
          arrivalDateDisplay: v.actualStart ? formatDateIST(v.actualStart) : null,
          departureDateDisplay: v.actualEnd ? formatDateIST(v.actualEnd) : null,
        },
        workDescription: v.workDescription || null,
        operationalNotes: v.operationalNotes || null,
        completedAt: v.completedAt ? v.completedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      filter,
      total: formattedVisits.length,
      visits: formattedVisits,
    });
  } catch (error: any) {
    console.error("[get-employee-visits] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
