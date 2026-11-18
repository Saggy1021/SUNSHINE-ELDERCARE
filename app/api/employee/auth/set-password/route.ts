import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createEmployeeSession } from "@/lib/auth/employee-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeId = body.employeeId?.trim()?.toUpperCase();
    const rawActivationToken = body.activationToken?.trim();
    const newPassword = body.newPassword;
    const confirmPassword = body.confirmPassword;

    if (!employeeId || !rawActivationToken || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All fields are required (Employee ID, activation token, password and confirmation)." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match. Please verify and re-enter." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const employee = await db.employee.findUnique({
      where: { employeeId },
    });

    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Employee account not found or inactive." },
        { status: 404 }
      );
    }

    // Verify activation token
    const pwdIdentifier = `emp_set_pwd_${employee.id}`;
    const hashedToken = crypto.createHash("sha256").update(rawActivationToken).digest("hex");

    const tokenRecord = await db.verificationToken.findFirst({
      where: { identifier: pwdIdentifier, token: hashedToken },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired activation session. Please restart activation." },
        { status: 400 }
      );
    }

    if (new Date(tokenRecord.expires) < new Date()) {
      await db.verificationToken.deleteMany({ where: { identifier: pwdIdentifier } });
      return NextResponse.json(
        { success: false, error: "Activation session has timed out. Please restart activation." },
        { status: 400 }
      );
    }

    // Consume token
    await db.verificationToken.deleteMany({ where: { identifier: pwdIdentifier } });

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update employee record
    const updatedEmployee = await db.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        isActivated: true,
        activatedAt: new Date(),
      },
    });

    // Create session token
    const sessionToken = await createEmployeeSession(updatedEmployee.id);
    const fullName = `${updatedEmployee.firstName} ${updatedEmployee.lastName}`.trim();
    const department = updatedEmployee.designation || "Care Operations";

    return NextResponse.json({
      success: true,
      message: "Password created successfully. Your account is now active.",
      token: sessionToken,
      sessionToken: sessionToken,
      employee: {
        id: updatedEmployee.id,
        employeeId: updatedEmployee.employeeId,
        name: fullName,
        firstName: updatedEmployee.firstName,
        lastName: updatedEmployee.lastName,
        designation: updatedEmployee.designation,
        department: department,
        email: updatedEmployee.email,
        contactNumber: updatedEmployee.contactNumber,
      },
    });
  } catch (error: any) {
    console.error("[set-password] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
