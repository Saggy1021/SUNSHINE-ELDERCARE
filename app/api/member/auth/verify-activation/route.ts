import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMemberId = body.memberId?.trim();
    const otp = body.otp?.trim();

    if (!rawMemberId || !otp) {
      return NextResponse.json(
        { success: false, error: "Member ID and 6-digit OTP are required." },
        { status: 400 }
      );
    }

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

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Invalid Member ID." },
        { status: 404 }
      );
    }

    const identifier = `member_act_${profile.id}`;
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const tokenRecord = await db.verificationToken.findFirst({
      where: {
        identifier,
        token: hashedOtp,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    if (new Date(tokenRecord.expires) < new Date()) {
      await db.verificationToken.deleteMany({ where: { identifier } });
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // OTP verified: remove it
    await db.verificationToken.deleteMany({ where: { identifier } });

    // Generate 15-minute activation token
    const rawActivationToken = crypto.randomBytes(32).toString("hex");
    const hashedActivationToken = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
    const tokenIdentifier = `member_act_token_${profile.id}`;

    await db.verificationToken.deleteMany({ where: { identifier: tokenIdentifier } });
    await db.verificationToken.create({
      data: {
        identifier: tokenIdentifier,
        token: hashedActivationToken,
        expires: new Date(Date.now() + 1000 * 60 * 15), // 15 mins
      },
    });

    return NextResponse.json({
      success: true,
      activationToken: rawActivationToken,
      message: "OTP verified. Proceed to set your password.",
    });
  } catch (error: any) {
    console.error("[MEMBER_VERIFY_ACTIVATION_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
