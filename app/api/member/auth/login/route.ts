import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createMemberSession } from "@/lib/auth/member-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = body.memberId?.trim() || body.identifier?.trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Member ID and password are required." },
        { status: 400 }
      );
    }

    // Locate profile by memberId or email
    let profile = await db.memberProfile.findFirst({
      where: {
        memberId: {
          equals: identifier,
          mode: "insensitive",
        },
      },
      include: {
        user: true,
      },
    });

    if (!profile && identifier.includes("@")) {
      profile = await db.memberProfile.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: "insensitive" } },
            { user: { email: { equals: identifier, mode: "insensitive" } } },
          ],
        },
        include: {
          user: true,
        },
      });
    }

    if (!profile || !profile.user) {
      return NextResponse.json(
        { success: false, error: "Invalid Member ID or password." },
        { status: 401 }
      );
    }

    const user = profile.user;

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Your account is inactive. Please contact Sunshine Eldercare." },
        { status: 403 }
      );
    }

    // Check if account has a password set
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          requiresActivation: true,
          error: "Account not activated. Please complete first-time activation to set your password.",
        },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid Member ID or password." },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createMemberSession(user.id);

    // Resolve subscription
    const currentSub = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        carePlan: true,
      },
    });

    const memberName = [profile.salutation, profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || user.name || "Sunshine Member";

    return NextResponse.json({
      success: true,
      token: sessionToken,
      member: {
        id: user.id,
        profileId: profile.id,
        memberId: profile.memberId || "MEMBER",
        name: memberName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email || user.email,
        phone: profile.mobileNumber || profile.alternateNumber,
        gender: profile.gender,
        status: user.status,
      },
      subscription: currentSub
        ? {
            id: currentSub.id,
            planName: currentSub.carePlan?.name || "Care Plan",
            planSlug: currentSub.carePlan?.slug || "care-plan",
            variantType: currentSub.variantType || "SINGLE",
            status: currentSub.status,
            startDate: currentSub.startDate ? currentSub.startDate.toISOString() : null,
            endDate: currentSub.endDate ? currentSub.endDate.toISOString() : null,
            hasEmergencyAssistant: true,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[MEMBER_LOGIN_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
