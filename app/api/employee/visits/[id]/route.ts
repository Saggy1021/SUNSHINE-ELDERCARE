import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";

function formatTime12HourIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDateIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function GET(
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

    const visit = await db.careVisit.findUnique({
      where: { id },
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
        assignments: true,
      },
    });

    if (!visit) {
      return NextResponse.json(
        { success: false, error: "Visit not found." },
        { status: 404 }
      );
    }

    // STRICT OWNER CHECK: Is this visit assigned to the authenticated employee?
    const isAssigned =
      visit.assignedEmpId === employee.id ||
      visit.assignments.some((a) => a.employeeId === employee.id);

    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: "Access denied. This visit is not assigned to you." },
        { status: 403 }
      );
    }

    const elder = visit.careCase?.elder;
    const memberUser = elder?.user;
    const profile = memberUser?.memberProfile;

    const primaryName = [
      profile?.salutation?.trim(),
      profile?.firstName?.trim() || memberUser?.name,
      profile?.lastName?.trim(),
    ].filter(Boolean).join(" ").trim() || "Member";

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

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        status: visit.status,
        member: {
          primaryName,
          spouseName,
          memberId: profile?.memberId || null,
          mobileNumber: profile?.mobileNumber || null,
          serviceAddress: profile?.serviceAddress || null,
        },
        scheduled: {
          start: visit.scheduledStart.toISOString(),
          end: visit.scheduledEnd.toISOString(),
          dateDisplay: formatDateIST(visit.scheduledStart),
          timeDisplay: `${formatTime12HourIST(visit.scheduledStart)} – ${formatTime12HourIST(visit.scheduledEnd)}`,
          startTimeDisplay: formatTime12HourIST(visit.scheduledStart),
          endTimeDisplay: formatTime12HourIST(visit.scheduledEnd),
        },
        actual: {
          arrival: visit.actualStart ? visit.actualStart.toISOString() : null,
          departure: visit.actualEnd ? visit.actualEnd.toISOString() : null,
          arrivalDisplay: visit.actualStart ? formatTime12HourIST(visit.actualStart) : null,
          departureDisplay: visit.actualEnd ? formatTime12HourIST(visit.actualEnd) : null,
          arrivalDateDisplay: visit.actualStart ? formatDateIST(visit.actualStart) : null,
          departureDateDisplay: visit.actualEnd ? formatDateIST(visit.actualEnd) : null,
        },
        workDescription: visit.workDescription || null,
        operationalNotes: visit.operationalNotes || null,
        completedAt: visit.completedAt ? visit.completedAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error("[get-employee-visit-detail] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
