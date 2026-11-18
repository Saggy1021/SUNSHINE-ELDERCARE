import { NextResponse } from "next/server";
import { getAuthenticatedEmployee, destroyEmployeeSession } from "@/lib/auth/employee-auth";

export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedEmployee(req);
    if (authResult.sessionToken) {
      await destroyEmployeeSession(authResult.sessionToken);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully logged out.",
    });
  } catch (error: any) {
    console.error("[employee-logout] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
