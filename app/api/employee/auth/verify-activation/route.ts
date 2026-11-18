import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeId = body.employeeId?.trim()?.toUpperCase();
    const rawOtp = body.otp?.trim();

    if (!employeeId || !rawOtp) {
      return NextResponse.json(
        { success: false, error: "Employee ID and 6-digit OTP are required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(rawOtp)) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP format. Must be a 6-digit number." },
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

    const identifier = `emp_act_${employee.id}`;
    const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

    const tokenRecord = await db.verificationToken.findFirst({
      where: { identifier, token: hashedOtp },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Incorrect verification code. Please check your email." },
        { status: 400 }
      );
    }

    if (new Date(tokenRecord.expires) < new Date()) {
      await db.verificationToken.deleteMany({ where: { identifier } });
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Single-use: delete consumed OTP immediately
    await db.verificationToken.deleteMany({ where: { identifier } });

    // Generate temporary password-setting token (15 mins)
    const rawActivationToken = crypto.randomBytes(32).toString("hex");
    const hashedActivationToken = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
    const pwdIdentifier = `emp_set_pwd_${employee.id}`;

    await db.verificationToken.deleteMany({ where: { identifier: pwdIdentifier } });
    await db.verificationToken.create({
      data: {
        identifier: pwdIdentifier,
        token: hashedActivationToken,
        expires: new Date(Date.now() + 1000 * 60 * 15),
      },
    });

    return NextResponse.json({
      success: true,
      activationToken: rawActivationToken,
      message: "Email verified successfully. Please create your password.",
    });
  } catch (error: any) {
    console.error("[verify-activation] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
