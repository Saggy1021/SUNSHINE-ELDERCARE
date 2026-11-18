import { NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";

export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedEmployee(req);
    if (!authResult.authenticated || !authResult.employee) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: authResult.employee,
    });
  } catch (error: any) {
    console.error("[employee-me] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
