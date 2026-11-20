import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedEmployee(req);
    if (!auth.authenticated || !auth.employee) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const employee = auth.employee;

    // Find active incident assigned to this employee
    const incident = await db.emergencyIncident.findFirst({
      where: {
        assignedEmployeeId: employee.id,
        status: { in: ["DISPATCHED", "RESPONDER_ON_SCENE"] },
      },
      orderBy: { dispatchedAt: "desc" },
    });

    if (!incident) {
      return NextResponse.json({
        success: true,
        hasAssignment: false,
      });
    }

    // Try to resolve member details
    let memberDetails: any = null;
    if (incident.memberId) {
      const profile = await db.memberProfile.findFirst({
        where: {
          memberId: { equals: incident.memberId, mode: "insensitive" },
        },
      });
      if (profile) {
        memberDetails = {
          memberId: profile.memberId,
          name: [profile.salutation, profile.firstName, profile.lastName].filter(Boolean).join(" "),
          phone: profile.mobileNumber || profile.alternateNumber,
          address: profile.serviceAddress,
          landmark: profile.nearestLandmark,
          bloodGroup: profile.bloodGroup,
        };
      }
    }

    return NextResponse.json({
      success: true,
      hasAssignment: true,
      assignment: {
        id: incident.id,
        incidentNumber: incident.incidentNumber,
        status: incident.status,
        classification: incident.classification,
        callerName: incident.callerName || memberDetails?.name || "Member",
        callerPhone: incident.callerPhone || memberDetails?.phone || null,
        address: incident.fallbackAddress || memberDetails?.address || "Address on file",
        latitude: incident.currentLatitude,
        longitude: incident.currentLongitude,
        locationAccuracy: incident.locationAccuracy,
        locationTimestamp: incident.locationTimestamp ? incident.locationTimestamp.toISOString() : null,
        dispatchNotes: incident.dispatchNotes,
        dispatchedAt: incident.dispatchedAt ? incident.dispatchedAt.toISOString() : incident.triggeredAt.toISOString(),
        responderArrivedAt: incident.responderArrivedAt ? incident.responderArrivedAt.toISOString() : null,
        member: memberDetails,
      },
    });
  } catch (error: any) {
    console.error("[EMPLOYEE_EMERGENCY_ACTIVE_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch active emergency assignment" },
      { status: 500 }
    );
  }
}
