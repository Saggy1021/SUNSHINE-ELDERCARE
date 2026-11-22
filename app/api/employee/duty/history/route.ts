import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { DutyService } from "@/lib/services/duty";

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

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const history = await DutyService.getEmployeeAttendanceHistory(auth.employee.id, {
      startDate: startDateParam ? new Date(startDateParam) : undefined,
      endDate: endDateParam ? new Date(endDateParam) : undefined,
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("[DUTY_HISTORY_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch duty history" },
      { status: 500 }
    );
  }
}
