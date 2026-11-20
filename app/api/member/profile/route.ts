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

    // Resolve current active/latest subscription for plan details
    const activeSub = await db.subscription.findFirst({
      where: {
        userId: member.id,
        status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "PENDING", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        carePlan: true,
      },
    });

    const planName = activeSub?.carePlan?.name || "Shield Shine";
    const variantFormatted = activeSub?.variantType
      ? activeSub.variantType.charAt(0).toUpperCase() + activeSub.variantType.slice(1).toLowerCase()
      : "Single";
    const durationMonths = activeSub?.durationMonths || 12;
    const membershipName = `${planName} — ${variantFormatted} (${durationMonths} Months)`;
    const membershipType = variantFormatted;
    const membershipStatus = activeSub?.status || member.status || "ACTIVE";
    const membershipStartDate = activeSub?.startDate ? activeSub.startDate.toISOString() : "";
    const membershipEndDate = activeSub?.endDate ? activeSub.endDate.toISOString() : "";

    return NextResponse.json({
      success: true,
      profile: {
        id: member.id,
        memberId: member.memberId,
        salutation: profile?.salutation || "Mr",
        firstName: profile?.firstName || member.firstName,
        lastName: profile?.lastName || member.lastName,
        name: member.name,
        email: profile?.email || member.email || "",
        phone: profile?.mobileNumber || member.phone || "",
        alternatePhone: profile?.alternateNumber || "",
        addressLine1: profile?.serviceAddress || "",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "",
        nearestLandmark: profile?.nearestLandmark || "",
        status: member.status || "ACTIVE",
        membershipName,
        membershipType,
        membershipStatus,
        membershipStartDate,
        membershipEndDate,
        bloodGroup: profile?.bloodGroup || "",
        medicalConditions: profile?.medicalConditions || "",
        allergies: "No known allergies",
        hospitalPreference: profile?.medicalAuth?.hospitalForSos || "",
        emergencyContactName: profile?.sponsor?.fullName || "",
        emergencyContactPhone: profile?.sponsor?.mobileNumber || "",
        emergencyContactRelation: profile?.sponsor?.relationship || "",
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
    if (typeof body.alternatePhone === "string") updateData.alternateNumber = body.alternatePhone.trim();
    if (typeof body.addressLine1 === "string") updateData.serviceAddress = body.addressLine1.trim();
    if (typeof body.nearestLandmark === "string") updateData.nearestLandmark = body.nearestLandmark.trim();
    if (typeof body.bloodGroup === "string") updateData.bloodGroup = body.bloodGroup.trim();
    if (typeof body.medicalConditions === "string") updateData.medicalConditions = body.medicalConditions.trim();

    if (Object.keys(updateData).length > 0) {
      await db.memberProfile.update({
        where: { id: member.profileId },
        data: updateData,
      });
    }

    // Upsert SOS hospital preference if provided
    if (typeof body.hospitalPreference === "string") {
      await db.medicalAuthorization.upsert({
        where: { memberProfileId: member.profileId },
        create: {
          memberProfileId: member.profileId,
          hospitalForSos: body.hospitalPreference.trim(),
        },
        update: {
          hospitalForSos: body.hospitalPreference.trim(),
        },
      });
    }

    // Update emergency contact (sponsor)
    if (body.emergencyContactName !== undefined || body.emergencyContactPhone !== undefined || body.emergencyContactRelation !== undefined) {
      const existingSponsor = await db.sponsor.findUnique({
        where: { memberProfileId: member.profileId },
      });

      if (existingSponsor) {
        await db.sponsor.update({
          where: { id: existingSponsor.id },
          data: {
            fullName: typeof body.emergencyContactName === "string" ? body.emergencyContactName.trim() : existingSponsor.fullName,
            mobileNumber: typeof body.emergencyContactPhone === "string" ? body.emergencyContactPhone.trim() : existingSponsor.mobileNumber,
            relationship: typeof body.emergencyContactRelation === "string" ? body.emergencyContactRelation.trim() : existingSponsor.relationship,
          },
        });
      } else if (body.emergencyContactName && body.emergencyContactPhone) {
        await db.sponsor.create({
          data: {
            memberProfileId: member.profileId,
            fullName: body.emergencyContactName.trim(),
            mobileNumber: body.emergencyContactPhone.trim(),
            relationship: body.emergencyContactRelation ? body.emergencyContactRelation.trim() : "Family",
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
