import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createMemberSession } from "@/lib/auth/member-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMemberId = body.memberId?.trim();
    const activationToken = body.activationToken?.trim();
    const password = body.password;

    if (!rawMemberId || !activationToken || !password) {
      return NextResponse.json(
        { success: false, error: "Member ID, activation token, and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
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

    if (!profile || !profile.user) {
      return NextResponse.json(
        { success: false, error: "Invalid Member ID." },
        { status: 404 }
      );
    }

    const tokenIdentifier = `member_act_token_${profile.id}`;
    const hashedActivationToken = crypto.createHash("sha256").update(activationToken).digest("hex");

    const tokenRecord = await db.verificationToken.findFirst({
      where: {
        identifier: tokenIdentifier,
        token: hashedActivationToken,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired activation session. Please restart activation." },
        { status: 400 }
      );
    }

    if (new Date(tokenRecord.expires) < new Date()) {
      await db.verificationToken.deleteMany({ where: { identifier: tokenIdentifier } });
      return NextResponse.json(
        { success: false, error: "Activation session has expired. Please restart activation." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // Update User password and increment sessionVersion
    await db.user.update({
      where: { id: profile.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });

    // Clean up activation token
    await db.verificationToken.deleteMany({ where: { identifier: tokenIdentifier } });

    // Create session
    const sessionToken = await createMemberSession(profile.userId);

    const memberName = [profile.salutation, profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || profile.user.name || "Sunshine Member";

    return NextResponse.json({
      success: true,
      token: sessionToken,
      member: {
        id: profile.userId,
        profileId: profile.id,
        memberId: profile.memberId,
        name: memberName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email || profile.user.email,
        phone: profile.mobileNumber || profile.alternateNumber,
        gender: profile.gender,
      },
    });
  } catch (error: any) {
    console.error("[MEMBER_SET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
