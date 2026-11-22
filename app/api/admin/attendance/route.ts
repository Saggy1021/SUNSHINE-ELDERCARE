import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { DutyService } from "@/lib/services/duty";

export const dynamic = "force-dynamic";

async function verifyAdminAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  const hasAccess =
    isOwner ||
    (await AuthorizationService.hasAdminPortalAccess(session.user.id, session.user.email));

  if (!hasAccess) {
    return { ok: false, status: 403, error: "Forbidden: Admin access required" };
  }

  return { ok: true, session };
}

export async function GET(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    let targetDate = new Date();
    if (dateParam) {
      const match = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [_, y, m, d] = match;
        targetDate = new Date(`${y}-${m}-${d}T12:00:00+05:30`);
      } else {
        targetDate = new Date(dateParam);
      }
    }

    const roster = await DutyService.getAttendanceRoster(targetDate);
    return NextResponse.json(roster);
  } catch (error: any) {
    console.error("[ADMIN_ATTENDANCE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attendance roster" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { employeeId, dutySessionId, reason, startTime, endTime, status } = body;

    if (!employeeId || !reason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Employee ID and a mandatory correction reason are required." },
        { status: 400 }
      );
    }

    const result = await DutyService.recordCorrection({
      employeeId,
      dutySessionId: dutySessionId || undefined,
      adminUserId: authCheck.session!.user.id,
      adminEmail: authCheck.session!.user.email || "admin",
      reason: reason.trim(),
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      status: status || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ADMIN_ATTENDANCE_CORRECTION_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record attendance correction" },
      { status: 500 }
    );
  }
}
