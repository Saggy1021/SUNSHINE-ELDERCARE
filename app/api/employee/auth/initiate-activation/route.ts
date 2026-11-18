import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { maskEmail } from "@/lib/auth/employee-auth";
import { EmailService } from "@/lib/services/email";
import { employeeActivationOtpEmail } from "@/lib/services/email/templates";

const emailService = new EmailService();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeId = body.employeeId?.trim()?.toUpperCase();

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "Employee ID is required." },
        { status: 400 }
      );
    }

    // 1. Locate employee by authoritative Employee ID
    const employee = await db.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Invalid Employee ID. Record not found." },
        { status: 404 }
      );
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Employee account is inactive. Please contact Admin." },
        { status: 403 }
      );
    }

    if (!employee.email) {
      return NextResponse.json(
        { success: false, error: "No registered email address found on employee record. Please contact Admin." },
        { status: 400 }
      );
    }

    // 2. Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes
    const identifier = `emp_act_${employee.id}`;

    // Purge any stale activation tokens for this employee
    await db.verificationToken.deleteMany({
      where: { identifier },
    });

    // Store hashed OTP in database
    await db.verificationToken.create({
      data: {
        identifier,
        token: hashedOtp,
        expires,
      },
    });

    // 3. Send email via established EmailService
    const template = employeeActivationOtpEmail({
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      otp: rawOtp,
    });

    await emailService.send({
      to: employee.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return NextResponse.json({
      success: true,
      message: "Activation verification code sent to registered email.",
      maskedEmail: maskEmail(employee.email),
      employeeName: `${employee.firstName} ${employee.lastName}`,
    });
  } catch (error: any) {
    console.error("[initiate-activation] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
