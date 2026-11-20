import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedMember } from "@/lib/auth/member-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedMember(req);
    if (!auth.authenticated || !auth.member) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const { member } = auth;
    const profile = await db.memberProfile.findUnique({
      where: { id: member.profileId },
      include: {
        sponsor: true,
        medicalAuth: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        email: member.email || "",
        phone: member.phone || "",
        addressLine1: profile?.serviceAddress || "",
        city: "Kolkata",
        state: "West Bengal",
        pincode: profile?.nearestLandmark || "",
        bloodGroup: profile?.bloodGroup || "",
        medicalConditions: profile?.medicalConditions || "None reported",
        allergies: "No known allergies",
        hospitalPreference: profile?.medicalAuth?.hospitalForSos || "",
        emergencyContactName: profile?.sponsor?.fullName || "",
        emergencyContactPhone: profile?.sponsor?.mobileNumber || "",
        emergencyContactRelation: profile?.sponsor?.relationship || "Family",
      },
    });
  } catch (error: any) {
    console.error("[MEMBER_PROFILE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load member profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedMember(req);
    if (!auth.authenticated || !auth.member) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const { member } = auth;
    const body = await req.json().catch(() => ({}));

    const updateData: any = {};
    if (typeof body.phone === "string") updateData.mobileNumber = body.phone.trim();
    if (typeof body.addressLine1 === "string") updateData.serviceAddress = body.addressLine1.trim();
    if (typeof body.bloodGroup === "string") updateData.bloodGroup = body.bloodGroup.trim();
    if (typeof body.medicalConditions === "string") updateData.medicalConditions = body.medicalConditions.trim();

    await db.memberProfile.update({
      where: { id: member.profileId },
      data: updateData,
    });

    // If emergency contact updated
    if (body.emergencyContactName || body.emergencyContactPhone) {
      const existingSponsor = await db.sponsor.findUnique({
        where: { memberProfileId: member.profileId },
      });

      if (existingSponsor) {
        await db.sponsor.update({
          where: { id: existingSponsor.id },
          data: {
            fullName: body.emergencyContactName || existingSponsor.fullName,
            mobileNumber: body.emergencyContactPhone || existingSponsor.mobileNumber,
            relationship: body.emergencyContactRelation || existingSponsor.relationship,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("[MEMBER_PROFILE_PUT_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
