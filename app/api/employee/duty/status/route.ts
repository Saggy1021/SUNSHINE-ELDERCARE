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

    const status = await DutyService.getDutyStatus(auth.employee.id);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("[DUTY_STATUS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch duty status" },
      { status: 500 }
    );
  }
}
