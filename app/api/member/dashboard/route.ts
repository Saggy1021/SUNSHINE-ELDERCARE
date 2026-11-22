import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedMember } from "@/lib/auth/member-auth";
import { db } from "@/lib/db";
import crypto from "crypto";

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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Execute independent database queries in parallel for peak performance
    const [profile, subscription, receipts, dbEvents, memberVisits, activeIncident, recentComplaints] =
      await Promise.all([
        db.memberProfile.findUnique({
          where: { id: member.profileId },
          include: {
            sponsor: true,
            medicalAuth: true,
          },
        }),
        db.subscription.findFirst({
          where: {
            userId: member.id,
            status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "EXPIRED"] },
          },
          orderBy: { createdAt: "desc" },
          include: {
            carePlan: true,
          },
        }),
        db.receipt.findMany({
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
        }),
        db.communityEvent.findMany({
          where: {
            status: "PUBLISHED",
            visibleToAll: true,
            eventDate: { gte: todayStart },
            audience: { in: ["EVERYONE", "MEMBERS_ONLY"] },
          },
          orderBy: { eventDate: "asc" },
          take: 10,
        }),
        // CareVisits scoped strictly to this member's subscriptions or care cases
        db.careVisit.findMany({
          where: {
            OR: [
              { careCase: { subscription: { userId: member.id } } },
              { careCase: { elder: { userId: member.id } } },
            ],
            status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
          },
          include: {
            assignedEmp: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                designation: true,
                contactNumber: true,
              },
            },
          },
          orderBy: { scheduledStart: "asc" },
          take: 10,
        }),
        // Active emergency incident, if any
        db.emergencyIncident.findFirst({
          where: {
            userId: member.id,
            status: { in: ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"] },
          },
          orderBy: { triggeredAt: "desc" },
          select: {
            id: true,
            incidentNumber: true,
            status: true,
            classification: true,
            triggeredAt: true,
          },
        }),
        // Member complaints for immediate status synchronization
        db.memberComplaint.findMany({
          where: { userId: member.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            complaintNumber: true,
            category: true,
            subject: true,
            description: true,
            status: true,
            adminResponse: true,
            createdAt: true,
            resolvedAt: true,
          },
        }),
      ]);

    // Enrolled services lookup
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
      const diff = subscription.endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

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

    // Format Assigned Care Staff & CareVisits
    const assignedVisits = memberVisits.map((v) => {
      const isActionable = v.status === "SCHEDULED" || v.status === "IN_PROGRESS";

      // If the visit is completed or cancelled, do not misleadingly show that employee as current assigned professional
      let employee = null;
      if (isActionable && v.assignedEmp) {
        employee = {
          id: v.assignedEmp.id,
          employeeId: v.assignedEmp.employeeId,
          name: `${v.assignedEmp.firstName} ${v.assignedEmp.lastName}`.trim(),
          designation: v.assignedEmp.designation || "Care Professional",
          contactNumber: v.assignedEmp.contactNumber || null,
        };
      }

      const startDate = new Date(v.scheduledStart);
      const endDate = new Date(v.scheduledEnd);

      const displayDate = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(startDate);

      const startTimeStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(startDate);

      const endTimeStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(endDate);

      return {
        id: v.id,
        status: v.status,
        scheduledStart: v.scheduledStart.toISOString(),
        scheduledEnd: v.scheduledEnd.toISOString(),
        displayDate,
        displayTime: `${startTimeStr} - ${endTimeStr}`,
        category: v.workDescription || "Scheduled Care Visit",
        operationalNotes: v.operationalNotes || null,
        employee,
      };
    });

    // Format Complaints
    const complaints = recentComplaints.map((c) => ({
      id: c.id,
      complaintNumber: c.complaintNumber,
      category: c.category,
      subject: c.subject,
      description: c.description,
      status: c.status,
      adminResponse: c.adminResponse,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    }));

    const incidentDto = activeIncident
      ? {
          id: activeIncident.id,
          incidentNumber: activeIncident.incidentNumber,
          status: activeIncident.status,
          classification: activeIncident.classification,
          triggeredAt: activeIncident.triggeredAt.toISOString(),
        }
      : null;

    const payload = {
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
      assignedVisits,
      activeIncident: incidentDto,
      recentComplaints: complaints,
    };

    const jsonStr = JSON.stringify(payload);
    const etag = `"${crypto.createHash("md5").update(jsonStr).digest("hex")}"`;

    // Conditional HTTP ETag check
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[MEMBER_DASHBOARD_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load member dashboard" },
      { status: 500 }
    );
  }
}
