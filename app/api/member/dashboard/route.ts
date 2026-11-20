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

    // Fetch full MemberProfile with relations
    const profile = await db.memberProfile.findUnique({
      where: { id: member.profileId },
      include: {
        sponsor: true,
        medicalAuth: true,
      },
    });

    // Fetch current active or latest subscription
    const subscription = await db.subscription.findFirst({
      where: {
        userId: member.id,
        status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        carePlan: true,
      },
    });

    let services: { serviceName: string; serviceNote: string | null }[] = [];
    let hasEmergencyAssistant = true;

    if (subscription?.carePlanId && subscription?.variantType) {
      const variant = await db.carePlanVariant.findUnique({
        where: {
          carePlanId_variantType: {
            carePlanId: subscription.carePlanId,
            variantType: subscription.variantType,
          },
        },
        include: {
          services: true,
        },
      });
      if (variant?.services) {
        services = variant.services.map((s) => ({
          serviceName: s.serviceName,
          serviceNote: s.serviceNote || null,
        }));
        hasEmergencyAssistant = variant.services.some(
          (s) => s.serviceName === "24/7 Emergency Assistant" || s.serviceName?.includes("Emergency")
        );
      }
    }

    // Days remaining calculation
    let daysRemaining = 0;
    if (subscription?.endDate) {
      const now = new Date();
      const diff = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Recent receipts
    const receipts = await db.receipt.findMany({
      where: { userId: member.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    const recentReceipts = receipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      amount: Number(r.amount),
      date: r.createdAt.toISOString().split("T")[0],
      method: r.paymentMethod || "ONLINE",
      downloadUrl: `/api/receipts/${r.id}/download`,
    }));

    const emergencyContact = profile?.sponsor
      ? {
          name: profile.sponsor.fullName,
          phone: profile.sponsor.mobileNumber,
          relation: profile.sponsor.relationship,
        }
      : null;

    const systemNotifications = [
      {
        id: "notif-1",
        title: "24/7 Emergency Assistance Active",
        message: "Your emergency response button is connected and active.",
        date: new Date().toISOString().split("T")[0],
        read: false,
      },
      {
        id: "notif-2",
        title: "Sunshine Care Team",
        message: "Dedicated eldercare support helpline is available anytime: 033-40585515.",
        date: new Date().toISOString().split("T")[0],
        read: true,
      },
    ];

    // Query active published community events for all active members
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dbEvents = await db.communityEvent.findMany({
      where: {
        status: "PUBLISHED",
        visibleToAll: true,
        eventDate: { gte: todayStart },
      },
      orderBy: { eventDate: "asc" },
      take: 10,
    });

    const monthNames = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];

    const events = dbEvents.map((e) => {
      const d = new Date(e.eventDate);
      const day = d.getDate().toString().padStart(2, "0");
      const month = monthNames[d.getMonth()] || "EVENT";
      const timeStr = e.endTime ? `${e.startTime} - ${e.endTime}` : e.startTime;

      return {
        id: e.id,
        date: day,
        month: month,
        title: e.title,
        description: e.description,
        location: e.venue,
        time: timeStr,
      };
    });

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        email: member.email || "",
        gender: member.gender,
        phone: member.phone,
        bloodGroup: profile?.bloodGroup || null,
        emergencyContact,
        preferredHospital: profile?.medicalAuth?.hospitalForSos || null,
      },
      membership: subscription
        ? {
            id: subscription.id,
            planName: subscription.carePlan?.name || "Care Plan",
            planSlug: subscription.carePlan?.slug || "care-plan",
            category: subscription.variantType || "SINGLE",
            variantType: subscription.variantType || "SINGLE",
            status: subscription.status,
            startDate: subscription.startDate ? subscription.startDate.toISOString() : null,
            endDate: subscription.endDate ? subscription.endDate.toISOString() : null,
            daysRemaining,
            hasEmergencyAssistant,
            services,
          }
        : null,
      recentReceipts,
      systemNotifications,
      events,
    });
  } catch (error: any) {
    console.error("[MEMBER_DASHBOARD_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load member dashboard" },
      { status: 500 }
    );
  }
}
