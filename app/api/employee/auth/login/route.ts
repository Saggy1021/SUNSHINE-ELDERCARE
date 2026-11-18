import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createEmployeeSession } from "@/lib/auth/employee-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeId = body.employeeId?.trim()?.toUpperCase();
    const password = body.password;

    if (!employeeId || !password) {
      return NextResponse.json(
        { success: false, error: "Employee ID and password are required." },
        { status: 400 }
      );
    }

    const employee = await db.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Invalid Employee ID or password." },
        { status: 401 }
      );
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Employee account is inactive. Please contact Admin." },
        { status: 403 }
      );
    }

    if (!employee.isActivated || !employee.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Your employee account has not been activated yet. Please complete first-time activation.",
          requiresActivation: true,
        },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, employee.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid Employee ID or password." },
        { status: 401 }
      );
    }

    const sessionToken = await createEmployeeSession(employee.id);

    return NextResponse.json({
      success: true,
      message: "Authentication successful.",
      token: sessionToken,
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        designation: employee.designation,
        email: employee.email,
        contactNumber: employee.contactNumber,
      },
    });
  } catch (error: any) {
    console.error("[employee-login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
