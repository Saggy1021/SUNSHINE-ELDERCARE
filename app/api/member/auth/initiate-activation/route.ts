import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { maskEmail } from "@/lib/auth/member-auth";
import { EmailService } from "@/lib/services/email";
import { memberActivationOtpEmail } from "@/lib/services/email/templates";

const emailService = new EmailService();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMemberId = body.memberId?.trim();

    if (!rawMemberId) {
      return NextResponse.json(
        { success: false, error: "Member ID is required." },
        { status: 400 }
      );
    }

    // Locate member by authoritative Member ID (case-insensitive)
    const profile = await db.memberProfile.findFirst({
      where: {
        memberId: {
          equals: rawMemberId,
          mode: "insensitive",
        },
      },
      include: {
        user: true,
      },
    });

    if (!profile || !profile.user) {
      return NextResponse.json(
        { success: false, error: "Invalid Member ID. Record not found." },
        { status: 404 }
      );
    }

    if (profile.user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Member account is inactive. Please contact Sunshine Eldercare." },
        { status: 403 }
      );
    }

    const email = profile.email || profile.user.email;
    if (!email) {
      return NextResponse.json(
        { success: false, error: "No registered email address found on member record. Please contact Sunshine Eldercare support." },
        { status: 400 }
      );
    }

    // Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes
    const identifier = `member_act_${profile.id}`;

    // Purge any stale activation tokens for this member
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

    const memberName = [profile.salutation, profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || profile.user.name || "Sunshine Member";

    // Send email
    try {
      const emailContent = memberActivationOtpEmail({
        memberName,
        memberId: profile.memberId || rawMemberId,
        otp: rawOtp,
      });
      await emailService.send({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (mailErr: any) {
      console.error("[MEMBER_ACTIVATION_EMAIL_ERROR]", mailErr);
    }

    return NextResponse.json({
      success: true,
      maskedEmail: maskEmail(email),
      message: `Verification code sent to ${maskEmail(email)}.`,
    });
  } catch (error: any) {
    console.error("[MEMBER_INITIATE_ACTIVATION_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
