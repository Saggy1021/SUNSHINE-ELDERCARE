import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { LeaveService } from "@/lib/services/leave";

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

    const history = await LeaveService.getEmployeeLeaveHistory(auth.employee.id);
    return NextResponse.json(history);
  } catch (error: any) {
    console.error("[EMPLOYEE_LEAVE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedEmployee(req);
    if (!auth.authenticated || !auth.employee) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const body = await req.json();
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { success: false, error: "Start date, end date, and reason are required." },
        { status: 400 }
      );
    }

    const result = await LeaveService.applyLeave({
      employeeId: auth.employee.id,
      startDate,
      endDate,
      reason,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[EMPLOYEE_LEAVE_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to apply for leave" },
      { status: 400 }
    );
  }
}
