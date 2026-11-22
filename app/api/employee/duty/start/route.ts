import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { DutyService } from "@/lib/services/duty";

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

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const result = await DutyService.startDuty({
      employeeId: auth.employee.id,
      latitude: body.latitude,
      longitude: body.longitude,
      notes: body.notes,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DUTY_START_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to start duty" },
      { status: 500 }
    );
  }
}
