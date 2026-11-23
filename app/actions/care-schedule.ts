"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import {
  parseISTDateTimeToUTC,
  formatTimeIST,
  formatPlanDisplay,
} from "@/components/admin/schedule/schedule-date-utils";
import { formatPreferredSchedule } from "@/lib/services/preferred-schedule";
import { RecurringSchedulerService } from "@/lib/services/recurring-scheduler";
import {
  BirthdayCalendarService,
  BirthdayCalendarPayload,
  BirthdayEntry,
} from "@/lib/services/birthday-calendar";

export interface ScheduleVisitDTO {
  id: string;
  careCaseId: string;
  isEmergency?: boolean;
  emergencyClassification?: string;
  emergencyIncidentNumber?: string;
  emergencyIncidentId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  workDescription?: string | null;
  completedAt?: string | null;
  actualDurationDisplay?: string | null;
  status: string;
  category: "Scheduled" | "Ad-hoc";
  occurrenceType?: "RECURRING" | "ADHOC";
  cancellationReason?: string | null;
  originalVisitId?: string | null;
  isIndividuallyRescheduled?: boolean;
  operationalNotes?: string | null;

  member: {
    userId: string;
    name: string;
    email: string; 
    memberId: string | null;
    serviceAddress: string | null;
    mobileNumber: string | null;
    preferredVisitDay?: string | null;
    preferredVisitTime?: string | null;
    preferredVisitFrequency?: string | null;
    preferredVisitFortnightlyPattern?: string | null;
    preferredScheduleDisplay?: string;
  };
  elder: {
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    address: string | null;
    city: string | null;
    contactNumber: string | null;
  };
  carePlanName: string;

  assignedEmployee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    contactNumber?: string | null;
  } | null;
  assignedCaregiver?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    contactNumber?: string | null;
  } | null;
  additionalCaregivers: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  }>;
}

export interface ScheduleMemberSearchResult {
  id: string; // careCaseId or new_sub_${sub.id}
  careCaseId: string;
  memberId: string; // canonical SECD... or "Not assigned"
  memberName: string; // Full registered member name
  serviceAddress: string; // Full registered service address
  primaryMobile: string; // Primary registered mobile number (never spouse's)
  subscribedPlan: string; // e.g. "Shield Shine – 6 Months" or "No service plan recorded"
  elderName: string; // Care recipient name
  elderId?: string;
  label: string; // Compact display label
  preferredVisitDay?: string | null;
  preferredVisitTime?: string | null;
  preferredVisitFrequency?: string | null;
  preferredVisitFortnightlyPattern?: string | null;
  preferredScheduleDisplay?: string;
}

export interface ScheduleEmployeeSearchResult {
  id: string; // employee cuid
  employeeId: string; // canonical SEC184SAAR
  name: string; // Full name "FirstName LastName"
  firstName: string;
  lastName: string;
  designation: string;
  department?: string | null;
  status: string; // "ACTIVE" | "INACTIVE"
  available: boolean;
  conflictTime?: string;
  conflictReason?: string;
}

export interface CareScheduleFormData {
  cases: Array<{
    id: string;
    careCaseId: string;
    label: string;
    memberName: string;
    memberId: string | null;
    elderName: string;
    serviceAddress: string | null;
    primaryMobile?: string | null;
    subscribedPlan?: string | null;
    preferredVisitDay?: string | null;
    preferredVisitTime?: string | null;
    preferredVisitFrequency?: string | null;
    preferredVisitFortnightlyPattern?: string | null;
    preferredScheduleDisplay?: string;
  }>;
  employees: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    displayName: string;
    department?: string | null;
  }>;
}

// Helpers
function parseCategory(notes?: string | null): { category: "Scheduled" | "Ad-hoc"; cleanNotes: string } {
  if (!notes) return { category: "Scheduled", cleanNotes: "" };
  if (notes.startsWith("[Ad-hoc]")) {
    return { category: "Ad-hoc", cleanNotes: notes.replace(/^\[Ad-hoc\]\s*/, "").trim() };
  }
  if (notes.startsWith("[Scheduled]")) {
    return { category: "Scheduled", cleanNotes: notes.replace(/^\[Scheduled\]\s*/, "").trim() };
  }
  return { category: "Scheduled", cleanNotes: notes };
}

function formatNotesWithCategory(category: string, rawNotes?: string | null): string {
  const clean = (rawNotes || "").replace(/^\[(Ad-hoc|Scheduled)\]\s*/, "").trim();
  const prefix = category === "Ad-hoc" ? "[Ad-hoc]" : "[Scheduled]";
  return clean ? `${prefix} ${clean}` : prefix;
}

async function requireSchedulePermission(requiredManage = false): Promise<{ userId: string; email: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";

  if (!isOwner) {
    if (requiredManage) {
      const canManage =
        (await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_VISIT_MANAGE, session.user.email)) ||
        (await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_MANAGE, session.user.email));
      if (!canManage) throw new Error("Forbidden: Care Visit Management permission required");
    } else {
      const canView =
        (await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_VISIT_VIEW, session.user.email)) ||
        (await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW, session.user.email));
      if (!canView) throw new Error("Forbidden: Care Visit View permission required");
    }
  }

  return { userId: session.user.id, email: session.user.email || "" };
}

/**
 * Appends active and resolved emergency incidents that have assigned field responders to the visit schedule.
 * Data-integrity guarantee: Emergency incidents are queried directly as a read model without creating duplicate
 * CareVisit rows or modifying membership quotas or billing. Reassigning an employee updates the same incident,
 * strictly preventing duplicate schedule entries.
 */
async function appendEmergencyResponderVisits(
  dtoList: ScheduleVisitDTO[],
  filters: {
    startDate: string;
    endDate: string;
    memberSearch?: string;
    caregiverId?: string;
    status?: string;
    category?: string;
    location?: string;
  },
  rangeStart: Date,
  rangeEnd: Date
): Promise<ScheduleVisitDTO[]> {
  try {
    // If category is explicitly filtered to "Scheduled", skip ad-hoc emergency assignments
    if (filters.category && filters.category !== "ALL" && filters.category !== "Ad-hoc") {
      return dtoList;
    }

    const emergencyWhere: any = {
      assignedEmployeeId: { not: null },
      OR: [
        { triggeredAt: { gte: rangeStart, lte: rangeEnd } },
        { dispatchedAt: { gte: rangeStart, lte: rangeEnd } },
        {
          status: { in: ["DISPATCHED", "RESPONDER_ON_SCENE", "TRIGGERED", "ACKNOWLEDGED"] },
          triggeredAt: { lte: rangeEnd },
        },
      ],
    };

    if (filters.caregiverId && filters.caregiverId !== "ALL") {
      emergencyWhere.assignedEmployeeId = filters.caregiverId;
    }

    if (filters.status && filters.status !== "ALL") {
      if (filters.status === "COMPLETED") {
        emergencyWhere.status = "RESOLVED";
      } else if (filters.status === "IN_PROGRESS") {
        emergencyWhere.status = { in: ["DISPATCHED", "RESPONDER_ON_SCENE"] };
      } else {
        // "SCHEDULED", "WAITLISTED", "CONFIRMED" do not match emergency responder assignments
        return dtoList;
      }
    }

    const emergencies = await db.emergencyIncident.findMany({
      where: emergencyWhere,
      include: {
        assignedEmployee: true,
        user: {
          include: {
            memberProfile: true,
            emergencyContact: true,
          },
        },
      },
      orderBy: { triggeredAt: "desc" },
    });

    for (const inc of emergencies) {
      if (!inc.assignedEmployee) continue;

      // Filter by memberSearch if provided
      if (filters.memberSearch && filters.memberSearch.trim()) {
        const q = filters.memberSearch.trim().toLowerCase();
        const callerMatch = inc.callerName?.toLowerCase().includes(q) ?? false;
        const memberIdMatch =
          (inc.memberId?.toLowerCase().includes(q) ?? false) ||
          (inc.user?.memberProfile?.memberId?.toLowerCase().includes(q) ?? false);
        const phoneMatch =
          (inc.callerPhone?.includes(q) ?? false) ||
          (inc.user?.memberProfile?.mobileNumber?.includes(q) ?? false);
        const incNumMatch = inc.incidentNumber.toLowerCase().includes(q);
        const userMatch = inc.user?.name?.toLowerCase().includes(q) ?? false;
        if (!callerMatch && !memberIdMatch && !phoneMatch && !incNumMatch && !userMatch) {
          continue;
        }
      }

      // Filter by location if provided
      if (filters.location && filters.location.trim()) {
        const locQ = filters.location.trim().toLowerCase();
        const address = inc.fallbackAddress || inc.user?.memberProfile?.serviceAddress || "";
        if (!address.toLowerCase().includes(locQ)) {
          continue;
        }
      }

      const isResolved = inc.status === "RESOLVED";
      const memberSalutation = inc.user?.memberProfile?.salutation || "Mr";
      const memberName =
        (inc.user?.memberProfile?.firstName
          ? `${memberSalutation} ${inc.user.memberProfile.firstName} ${inc.user.memberProfile.lastName || ""}`.trim()
          : null) ||
        inc.callerName ||
        inc.user?.name ||
        "Emergency Member";

      const start = inc.dispatchedAt || inc.triggeredAt;
      const end = inc.resolvedAt || new Date(start.getTime() + 2 * 3600 * 1000);

      // Duration display if resolved
      let durationDisplay: string | null = null;
      if (inc.dispatchedAt && inc.resolvedAt) {
        const diffMs = inc.resolvedAt.getTime() - inc.dispatchedAt.getTime();
        if (diffMs >= 0) {
          const totalMins = Math.round(diffMs / 60000);
          const hrs = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          durationDisplay = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }
      }

      dtoList.push({
        id: `emg-${inc.id}`,
        careCaseId: `emg-${inc.id}`,
        isEmergency: true,
        emergencyClassification: inc.classification, // "CODE_RED", "CODE_YELLOW", "CODE_GREEN"
        emergencyIncidentNumber: inc.incidentNumber,
        emergencyIncidentId: inc.id,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        actualStart: inc.dispatchedAt ? inc.dispatchedAt.toISOString() : inc.triggeredAt.toISOString(),
        actualEnd: inc.resolvedAt ? inc.resolvedAt.toISOString() : null,
        completedAt: inc.resolvedAt ? inc.resolvedAt.toISOString() : null,
        actualDurationDisplay: durationDisplay,
        status: isResolved ? "COMPLETED" : (inc.status === "RESPONDER_ON_SCENE" ? "IN_PROGRESS" : inc.status),
        category: "Ad-hoc",
        workDescription: inc.resolutionNotes || null,
        operationalNotes: inc.dispatchNotes || inc.triggerNotes || null,
        carePlanName: `EmergencyOS — ${inc.classification.replace("_", " ")}`,
        member: {
          userId: inc.userId || "",
          name: memberName,
          email: inc.user?.email || "",
          memberId: inc.memberId || inc.user?.memberProfile?.memberId || null,
          serviceAddress: inc.fallbackAddress || inc.user?.memberProfile?.serviceAddress || "Address on record",
          mobileNumber: inc.callerPhone || inc.user?.memberProfile?.mobileNumber || inc.user?.emergencyContact?.phone || null,
          preferredVisitDay: null,
          preferredVisitTime: null,
          preferredScheduleDisplay: "Immediate Emergency Dispatch",
        },
        elder: {
          id: inc.userId || inc.id,
          firstName: memberName,
          lastName: "",
          relationship: "Self / Member",
          address: inc.fallbackAddress || inc.user?.memberProfile?.serviceAddress || null,
          city: "Kolkata",
          contactNumber: inc.callerPhone || inc.user?.memberProfile?.mobileNumber || null,
        },
        assignedEmployee: {
          id: inc.assignedEmployee.id,
          employeeId: inc.assignedEmployee.employeeId,
          firstName: inc.assignedEmployee.firstName,
          lastName: inc.assignedEmployee.lastName,
          designation: inc.assignedEmployee.designation,
          contactNumber: inc.assignedEmployee.contactNumber || null,
        },
        assignedCaregiver: {
          id: inc.assignedEmployee.id,
          employeeId: inc.assignedEmployee.employeeId,
          firstName: inc.assignedEmployee.firstName,
          lastName: inc.assignedEmployee.lastName,
          designation: inc.assignedEmployee.designation,
          contactNumber: inc.assignedEmployee.contactNumber || null,
        },
        additionalCaregivers: [],
      });
    }

    dtoList.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  } catch (err) {
    console.warn("[appendEmergencyResponderVisits] Error querying emergency incidents:", err);
  }
  return dtoList;
}

/**
 * Fetch visits scoped to a date range with optional server-side filtering.
 */
export async function getScheduleVisits(filters: {
  startDate: string;
  endDate: string;
  memberSearch?: string;
  caregiverId?: string;
  status?: string;
  category?: string;
  location?: string;
}): Promise<ScheduleVisitDTO[]> {
  await requireSchedulePermission(false);

  const startUtc = new Date(filters.startDate);
  const endUtc = new Date(filters.endDate);

  // Buffer range slightly to account for timezones
  const rangeStart = new Date(startUtc.getTime() - 14 * 3600 * 1000);
  const rangeEnd = new Date(endUtc.getTime() + 14 * 3600 * 1000);

  if (typeof db.$queryRaw === "function") {
    try {
      const statusCondition =
        filters.status && filters.status !== "ALL"
          ? Prisma.sql`AND cv.status = ${filters.status}`
          : Prisma.empty;

      const caregiverCondition =
        filters.caregiverId && filters.caregiverId !== "ALL"
          ? Prisma.sql`AND (cv."assignedEmpId" = ${filters.caregiverId} OR EXISTS (SELECT 1 FROM "VisitAssignment" va2 WHERE va2."visitId" = cv.id AND va2."employeeId" = ${filters.caregiverId}))`
          : Prisma.empty;

      const rawVisits: any[] = await db.$queryRaw(Prisma.sql`
        SELECT 
          cv.id,
          cv.status,
          cv."operationalNotes",
          cv."scheduledStart",
          cv."scheduledEnd",
          cv."actualStart",
          cv."actualEnd",
          cv."workDescription",
          cv."completedAt",
          cv."completedById",
          cv."careCaseId",
          cv."assignedEmpId",
          cv."occurrenceType",
          cv."cancellationReason",
          cv."originalVisitId",
          cv."isIndividuallyRescheduled",
          e.id AS "elderId",
          e."firstName" AS "elderFirstName",
          e."lastName" AS "elderLastName",
          e.relationship AS "elderRelationship",
          e.address AS "elderAddress",
          e.city AS "elderCity",
          e."contactNumber" AS "elderContactNumber",
          u.id AS "userId",
          u.name AS "userName",
          u.email AS "userEmail",
          mp.salutation AS "profileSalutation",
          mp."firstName" AS "profileFirstName",
          mp."lastName" AS "profileLastName",
          mp."memberId" AS "profileMemberId",
          mp."serviceAddress" AS "profileServiceAddress",
          mp."mobileNumber" AS "profileMobileNumber",
          mp."preferredVisitDay" AS "preferredVisitDay",
          mp."preferredVisitTime" AS "preferredVisitTime",
          mp."preferredVisitFrequency" AS "preferredVisitFrequency",
          mp."preferredVisitFortnightlyPattern" AS "preferredVisitFortnightlyPattern",
          cp.name AS "carePlanName",
          emp.id AS "empId",
          emp."employeeId" AS "empEmployeeId",
          emp."firstName" AS "empFirstName",
          emp."lastName" AS "empLastName",
          emp.designation AS "empDesignation",
          emp."contactNumber" AS "empContactNumber"
        FROM "CareVisit" cv
        LEFT JOIN "CareCase" cc ON cv."careCaseId" = cc.id
        LEFT JOIN "Elder" e ON cc."elderId" = e.id
        LEFT JOIN "User" u ON e."userId" = u.id
        LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
        LEFT JOIN "Subscription" sub ON cc."subscriptionId" = sub.id
        LEFT JOIN "CarePlan" cp ON sub."carePlanId" = cp.id
        LEFT JOIN "Employee" emp ON cv."assignedEmpId" = emp.id
        WHERE cv."scheduledStart" >= ${rangeStart} AND cv."scheduledStart" <= ${rangeEnd}
          ${statusCondition}
          ${caregiverCondition}
        ORDER BY cv."scheduledStart" ASC
      `);

      const visitIds = rawVisits.map((v) => v.id);
      const relieversByVisit: Record<string, any[]> = {};
      if (visitIds.length > 0) {
        const assignments: any[] = await db.$queryRaw(Prisma.sql`
          SELECT 
            va."visitId",
            emp.id,
            emp."employeeId",
            emp."firstName",
            emp."lastName",
            emp.designation
          FROM "VisitAssignment" va
          JOIN "Employee" emp ON va."employeeId" = emp.id
          WHERE va."visitId" IN (${Prisma.join(visitIds)})
        `);
        for (const a of assignments) {
          if (!relieversByVisit[a.visitId]) relieversByVisit[a.visitId] = [];
          relieversByVisit[a.visitId].push({
            id: a.id,
            employeeId: a.employeeId,
            firstName: a.firstName,
            lastName: a.lastName,
            designation: a.designation,
          });
        }
      }

      const dtoList: ScheduleVisitDTO[] = [];
      for (const v of rawVisits) {
        // Filter by memberSearch if provided
        if (filters.memberSearch && filters.memberSearch.trim()) {
          const q = filters.memberSearch.trim().toLowerCase();
          const matchElder = `${v.elderFirstName || ""} ${v.elderLastName || ""}`.toLowerCase().includes(q);
          const matchMember =
            (v.userName && v.userName.toLowerCase().includes(q)) ||
            `${v.profileFirstName || ""} ${v.profileLastName || ""}`.toLowerCase().includes(q);
          const matchMid = v.profileMemberId && v.profileMemberId.toLowerCase().includes(q);
          if (!matchElder && !matchMember && !matchMid) {
            continue;
          }
        }

        // Filter by category if provided
        const parsedCat = parseCategory(v.operationalNotes);
        if (filters.category && filters.category !== "ALL") {
          if (parsedCat.category !== filters.category) {
            continue;
          }
        }

        // Filter by location if provided
        if (filters.location && filters.location.trim()) {
          const locQ = filters.location.trim().toLowerCase();
          const address = v.profileServiceAddress || v.elderAddress || v.elderCity || "";
          if (!address.toLowerCase().includes(locQ)) {
            continue;
          }
        }

        const memberSalutation = v.profileSalutation || "Mr";
        const memberProfileName = v.profileFirstName
          ? `${memberSalutation} ${v.profileFirstName} ${v.profileLastName || ""}`.trim()
          : null;
        const memberName =
          memberProfileName ||
          v.userName ||
          `${v.elderFirstName || ""} ${v.elderLastName || ""}`.trim() ||
          "Member";
        const elderName = v.elderFirstName ? `${v.elderFirstName} ${v.elderLastName || ""}`.trim() : memberName;

        const assignedRelievers = relieversByVisit[v.id] || [];
        const primaryReliever = assignedRelievers[0];

        const assignedEmpData = v.empId
          ? {
              id: v.empId,
              employeeId: v.empEmployeeId,
              firstName: v.empFirstName,
              lastName: v.empLastName,
              designation: v.empDesignation,
              contactNumber: v.empContactNumber || null,
            }
          : primaryReliever
          ? {
              id: primaryReliever.id,
              employeeId: primaryReliever.employeeId,
              firstName: primaryReliever.firstName,
              lastName: primaryReliever.lastName,
              designation: primaryReliever.designation,
              contactNumber: null,
            }
          : null;

        const additionalCaregivers = v.empId
          ? assignedRelievers.map((a) => ({
              id: a.id,
              employeeId: a.employeeId,
              firstName: a.firstName,
              lastName: a.lastName,
            }))
          : assignedRelievers.slice(1).map((a) => ({
              id: a.id,
              employeeId: a.employeeId,
              firstName: a.firstName,
              lastName: a.lastName,
            }));

        let durationDisplay: string | null = null;
        if (v.actualStart && v.actualEnd) {
          const start = v.actualStart instanceof Date ? v.actualStart : new Date(v.actualStart);
          const end = v.actualEnd instanceof Date ? v.actualEnd : new Date(v.actualEnd);
          const diffMs = end.getTime() - start.getTime();
          if (diffMs >= 0) {
            const totalMinutes = Math.round(diffMs / (1000 * 60));
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            if (hours > 0) {
              durationDisplay = `${hours}h ${mins}m`;
            } else {
              durationDisplay = `${mins}m`;
            }
          }
        }

        dtoList.push({
          id: v.id,
          careCaseId: v.careCaseId,
          scheduledStart:
            v.scheduledStart instanceof Date ? v.scheduledStart.toISOString() : new Date(v.scheduledStart).toISOString(),
          scheduledEnd:
            v.scheduledEnd instanceof Date ? v.scheduledEnd.toISOString() : new Date(v.scheduledEnd).toISOString(),
          actualStart: v.actualStart
            ? v.actualStart instanceof Date
              ? v.actualStart.toISOString()
              : new Date(v.actualStart).toISOString()
            : null,
          actualEnd: v.actualEnd
            ? v.actualEnd instanceof Date
              ? v.actualEnd.toISOString()
              : new Date(v.actualEnd).toISOString()
            : null,
          workDescription: v.workDescription || null,
          completedAt: v.completedAt
            ? v.completedAt instanceof Date
              ? v.completedAt.toISOString()
              : new Date(v.completedAt).toISOString()
            : null,
          actualDurationDisplay: durationDisplay,
          status: v.status,
          category: parsedCat.category,
          occurrenceType: (v.occurrenceType as "RECURRING" | "ADHOC") || (parsedCat.category === "Ad-hoc" ? "ADHOC" : "RECURRING"),
          cancellationReason: v.cancellationReason || null,
          originalVisitId: v.originalVisitId || null,
          isIndividuallyRescheduled: Boolean(v.isIndividuallyRescheduled),
          operationalNotes: parsedCat.cleanNotes || v.operationalNotes,
          member: {
            userId: v.userId || "",
            name: memberName,
            email: v.userEmail || "",
            memberId: v.profileMemberId || null,
            serviceAddress: v.profileServiceAddress || v.elderAddress || null,
            mobileNumber: v.profileMobileNumber || v.elderContactNumber || null,
            preferredVisitDay: v.preferredVisitDay || null,
            preferredVisitTime: v.preferredVisitTime || null,
            preferredVisitFrequency: v.preferredVisitFrequency || null,
            preferredVisitFortnightlyPattern: v.preferredVisitFortnightlyPattern || null,
            preferredScheduleDisplay: formatPreferredSchedule(
              v.preferredVisitDay,
              v.preferredVisitTime,
              v.preferredVisitFrequency,
              v.preferredVisitFortnightlyPattern
            ),
          },
          elder: {
            id: v.elderId || "",
            firstName: v.elderFirstName || "",
            lastName: v.elderLastName || "",
            relationship: v.elderRelationship || "Self",
            address: v.elderAddress || v.profileServiceAddress || null,
            city: v.elderCity || null,
            contactNumber: v.elderContactNumber || null,
          },
          carePlanName: v.carePlanName || "Care Plan",
          assignedEmployee: assignedEmpData,
          assignedCaregiver: assignedEmpData,
          additionalCaregivers,
        });
      }

      return appendEmergencyResponderVisits(dtoList, filters, rangeStart, rangeEnd);
    } catch (err) {
      console.warn("[getScheduleVisits] $queryRaw failed, falling back to Prisma findMany:", err);
    }
  }

  const whereClause: any = {
    scheduledStart: {
      gte: rangeStart,
      lte: rangeEnd,
    },
  };

  if (filters.status && filters.status !== "ALL") {
    whereClause.status = filters.status;
  }

  if (filters.caregiverId && filters.caregiverId !== "ALL") {
    whereClause.OR = [
      { assignedEmpId: filters.caregiverId },
      { assignments: { some: { employeeId: filters.caregiverId } } },
    ];
  }

  const visits = await db.careVisit.findMany({
    where: whereClause,
    orderBy: { scheduledStart: "asc" },
    include: {
      careCase: {
        include: {
          elder: {
            include: {
              user: {
                include: { memberProfile: true },
              },
            },
          },
          subscription: {
            include: { carePlan: true },
          },
        },
      },
      assignedEmp: true,
      assignments: {
        include: {
          employee: true,
        },
      },
    },
  });

  const dtoList: ScheduleVisitDTO[] = [];

  for (const v of visits) {
    const elder = v.careCase?.elder;
    const memberUser = elder?.user;
    const profile = memberUser?.memberProfile;

    // Filter by memberSearch if provided
    if (filters.memberSearch && filters.memberSearch.trim()) {
      const q = filters.memberSearch.trim().toLowerCase();
      const matchElder = elder && `${elder.firstName} ${elder.lastName}`.toLowerCase().includes(q);
      const matchMember = memberUser && memberUser.name && memberUser.name.toLowerCase().includes(q);
      const matchMid = profile && profile.memberId && profile.memberId.toLowerCase().includes(q);
      if (!matchElder && !matchMember && !matchMid) {
        continue;
      }
    }

    // Filter by category if provided
    const parsedCat = parseCategory(v.operationalNotes);
    if (filters.category && filters.category !== "ALL") {
      if (parsedCat.category !== filters.category) {
        continue;
      }
    }

    // Filter by location if provided
    if (filters.location && filters.location.trim()) {
      const locQ = filters.location.trim().toLowerCase();
      const address = profile?.serviceAddress || elder?.address || elder?.city || "";
      if (!address.toLowerCase().includes(locQ)) {
        continue;
      }
    }

    const memberName = memberUser?.name || `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Member";
    const elderName = elder ? `${elder.firstName} ${elder.lastName}`.trim() : memberName;

    const assignedEmpData = v.assignedEmp
      ? {
          id: v.assignedEmp.id,
          employeeId: v.assignedEmp.employeeId,
          firstName: v.assignedEmp.firstName,
          lastName: v.assignedEmp.lastName,
          designation: v.assignedEmp.designation,
          contactNumber: v.assignedEmp.contactNumber,
        }
      : v.assignments[0]?.employee
      ? {
          id: v.assignments[0].employee.id,
          employeeId: v.assignments[0].employee.employeeId,
          firstName: v.assignments[0].employee.firstName,
          lastName: v.assignments[0].employee.lastName,
          designation: v.assignments[0].employee.designation,
          contactNumber: v.assignments[0].employee.contactNumber,
        }
      : null;

    let durationDisplay: string | null = null;
    if (v.actualStart && v.actualEnd) {
      const diffMs = v.actualEnd.getTime() - v.actualStart.getTime();
      if (diffMs >= 0) {
        const totalMinutes = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        if (hours > 0) {
          durationDisplay = `${hours} hr${hours > 1 ? "s" : ""}${mins > 0 ? ` ${mins} min${mins > 1 ? "s" : ""}` : ""}`;
        } else {
          durationDisplay = `${mins} min${mins !== 1 ? "s" : ""}`;
        }
      }
    }

    dtoList.push({
      id: v.id,
      careCaseId: v.careCaseId,
      scheduledStart: v.scheduledStart.toISOString(),
      scheduledEnd: v.scheduledEnd.toISOString(),
      actualStart: v.actualStart ? v.actualStart.toISOString() : null,
      actualEnd: v.actualEnd ? v.actualEnd.toISOString() : null,
      workDescription: v.workDescription || null,
      completedAt: v.completedAt ? v.completedAt.toISOString() : null,
      actualDurationDisplay: durationDisplay,
      status: v.status,
      category: parsedCat.category,
      occurrenceType: (v.occurrenceType as "RECURRING" | "ADHOC") || (parsedCat.category === "Ad-hoc" ? "ADHOC" : "RECURRING"),
      cancellationReason: v.cancellationReason || null,
      originalVisitId: v.originalVisitId || null,
      isIndividuallyRescheduled: Boolean(v.isIndividuallyRescheduled),
      operationalNotes: parsedCat.cleanNotes || v.operationalNotes,
      member: {
        userId: memberUser?.id || "",
        name: memberName,
        email: memberUser?.email || "",
        memberId: profile?.memberId || null,
        serviceAddress: profile?.serviceAddress || elder?.address || null,
        mobileNumber: profile?.mobileNumber || elder?.contactNumber || null,
        preferredVisitDay: profile?.preferredVisitDay || null,
        preferredVisitTime: profile?.preferredVisitTime || null,
        preferredVisitFrequency: profile?.preferredVisitFrequency || null,
        preferredVisitFortnightlyPattern: profile?.preferredVisitFortnightlyPattern || null,
        preferredScheduleDisplay: formatPreferredSchedule(
          profile?.preferredVisitDay,
          profile?.preferredVisitTime,
          profile?.preferredVisitFrequency,
          profile?.preferredVisitFortnightlyPattern
        ),
      },
      elder: {
        id: elder?.id || "",
        firstName: elder?.firstName || "",
        lastName: elder?.lastName || "",
        relationship: elder?.relationship || "Self",
        address: elder?.address || profile?.serviceAddress || null,
        city: elder?.city || null,
        contactNumber: elder?.contactNumber || null,
      },
      carePlanName: v.careCase?.subscription?.carePlan?.name || "Care Plan",
      assignedEmployee: assignedEmpData,
      assignedCaregiver: assignedEmpData,
      additionalCaregivers: v.assignments.slice(1).map((a) => ({
        id: a.employee.id,
        employeeId: a.employee.employeeId,
        firstName: a.employee.firstName,
        lastName: a.employee.lastName,
      })),
    });
  }

  return appendEmergencyResponderVisits(dtoList, filters, rangeStart, rangeEnd);
}

/**
 * Returns available cases (active subscriptions / elders) and active employees for scheduling modals.
 * Accelerated with single-roundtrip join eliminating waterfall query contention.
 */
export async function getCareScheduleFormData(): Promise<CareScheduleFormData> {
  await requireSchedulePermission(false);

  const [casesOptions, activeEmployees] = await Promise.all([
    searchScheduleMembers(""),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
      },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const employeeOptions = activeEmployees.map((emp) => {
    const codePart = emp.employeeId ? ` (${emp.employeeId})` : "";
    const desigPart = emp.designation ? ` - ${emp.designation}` : "";
    return {
      ...emp,
      displayName: `${emp.firstName} ${emp.lastName}${codePart}${desigPart}`,
    };
  });

  return {
    cases: casesOptions,
    employees: employeeOptions,
  };
}

/**
 * Checks employee availability for a specific date and time interval in Asia/Kolkata.
 * Identifies conflicts using interval overlap: existingStart < requestedEnd AND existingEnd > requestedStart.
 */
export async function getEmployeeAvailability(params: {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  excludeVisitId?: string;
}): Promise<
  Array<{
    employeeId: string;
    available: boolean;
    conflictTime?: string;
    conflictReason?: string;
  }>
> {
  await requireSchedulePermission(false);

  const scheduledStart = parseISTDateTimeToUTC(params.date, params.startTime);
  const scheduledEnd = parseISTDateTimeToUTC(params.date, params.endTime);

  if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime()) || scheduledEnd <= scheduledStart) {
    return [];
  }

  // Active employees
  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  });

  // Operationally active statuses that block employee availability
  const blockingVisits = await db.careVisit.findMany({
    where: {
      id: params.excludeVisitId ? { not: params.excludeVisitId } : undefined,
      status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
    select: {
      id: true,
      assignedEmpId: true,
      scheduledStart: true,
      scheduledEnd: true,
      status: true,
      assignments: { select: { employeeId: true } },
      careCase: {
        select: {
          elder: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Also query active emergency dispatches that block employee availability
  const blockingEmergencies = await db.emergencyIncident.findMany({
    where: {
      assignedEmployeeId: { not: null },
      status: { in: ["DISPATCHED", "RESPONDER_ON_SCENE"] },
      triggeredAt: { lt: scheduledEnd },
    },
    select: {
      id: true,
      incidentNumber: true,
      assignedEmployeeId: true,
      classification: true,
      callerName: true,
      dispatchedAt: true,
      triggeredAt: true,
    },
  });

  return employees.map((emp) => {
    // Check emergency conflict first
    const emergencyConflict = blockingEmergencies.find((e) => e.assignedEmployeeId === emp.id);
    if (emergencyConflict) {
      const start = emergencyConflict.dispatchedAt || emergencyConflict.triggeredAt;
      const timeStr = formatTimeIST(start);
      return {
        employeeId: emp.id,
        available: false,
        conflictTime: timeStr,
        conflictReason: `Active Emergency Dispatch (${emergencyConflict.incidentNumber} - ${emergencyConflict.callerName || "Member"})`,
      };
    }

    const conflict = blockingVisits.find(
      (v) => v.assignedEmpId === emp.id || v.assignments.some((a) => a.employeeId === emp.id)
    );

    if (conflict) {
      const memberName =
        conflict.careCase?.elder?.user?.name ||
        `${conflict.careCase?.elder?.firstName || ""} ${conflict.careCase?.elder?.lastName || ""}`.trim() ||
        "Member";
      const timeStr = `${formatTimeIST(conflict.scheduledStart)} – ${formatTimeIST(conflict.scheduledEnd)}`;
      return {
        employeeId: emp.id,
        available: false,
        conflictTime: timeStr,
        conflictReason: `Occupied (${timeStr} for ${memberName})`,
      };
    }

    return {
      employeeId: emp.id,
      available: true,
    };
  });
}

/**
 * Server-side searchable member / care case autocomplete action.
 * Allows searching by member name, member ID (canonical SECD...), service address, and elder/care recipient name.
 * Optimized with single-roundtrip parameterized SQL join, eliminating N+1 waterfall queries.
 * Returns the 5 mandatory fields: Member Name, Member ID, Full Service Address, Primary Mobile Number, and Subscribed Plan with duration.
 */
export async function searchScheduleMembers(query: string = ""): Promise<ScheduleMemberSearchResult[]> {
  await requireSchedulePermission(false);

  const q = (query || "").trim();
  const terms = q.split(/\s+/).filter(Boolean);

  const caseTermConditions = terms.map((t) => {
    const pattern = `%${t}%`;
    return Prisma.sql`(
      e."firstName" ILIKE ${pattern} OR
      e."lastName" ILIKE ${pattern} OR
      e.address ILIKE ${pattern} OR
      u.name ILIKE ${pattern} OR
      mp."memberId" ILIKE ${pattern} OR
      mp."firstName" ILIKE ${pattern} OR
      mp."lastName" ILIKE ${pattern} OR
      mp."serviceAddress" ILIKE ${pattern}
    )`;
  });

  const caseWhere =
    caseTermConditions.length > 0
      ? Prisma.sql`cc.status = 'ACTIVE' AND ${Prisma.join(caseTermConditions, " AND ")}`
      : Prisma.sql`cc.status = 'ACTIVE'`;

  const subTermConditions = terms.map((t) => {
    const pattern = `%${t}%`;
    return Prisma.sql`(
      u.name ILIKE ${pattern} OR
      mp."memberId" ILIKE ${pattern} OR
      mp."firstName" ILIKE ${pattern} OR
      mp."lastName" ILIKE ${pattern} OR
      mp."serviceAddress" ILIKE ${pattern} OR
      EXISTS (
        SELECT 1 FROM "Elder" sub_e 
        WHERE sub_e."userId" = u.id AND (
          sub_e."firstName" ILIKE ${pattern} OR 
          sub_e."lastName" ILIKE ${pattern} OR 
          sub_e.address ILIKE ${pattern}
        )
      )
    )`;
  });

  const subWhere =
    subTermConditions.length > 0
      ? Prisma.sql`s.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "CareCase" cc_sub WHERE cc_sub."subscriptionId" = s.id) AND ${Prisma.join(subTermConditions, " AND ")}`
      : Prisma.sql`s.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "CareCase" cc_sub WHERE cc_sub."subscriptionId" = s.id)`;

  const querySql = Prisma.sql`
    SELECT * FROM (
      SELECT 
        cc.id AS "id",
        cc.id AS "careCaseId",
        false AS "isNewSub",
        e.id AS "elderId",
        e."firstName" AS "elderFirstName",
        e."lastName" AS "elderLastName",
        e.address AS "elderAddress",
        u.name AS "userName",
        mp.salutation AS "profileSalutation",
        mp."memberId" AS "canonicalMemberId",
        mp."firstName" AS "profileFirstName",
        mp."lastName" AS "profileLastName",
        mp."serviceAddress" AS "profileServiceAddress",
        mp."mobileNumber" AS "profileMobile",
        mp."preferredVisitDay" AS "preferredVisitDay",
        mp."preferredVisitTime" AS "preferredVisitTime",
        mp."preferredVisitFrequency" AS "preferredVisitFrequency",
        mp."preferredVisitFortnightlyPattern" AS "preferredVisitFortnightlyPattern",
        sub.id AS "subscriptionId",
        sub."durationMonths" AS "subDurationMonths",
        sub."startDate" AS "subStartDate",
        sub."endDate" AS "subEndDate",
        cp.name AS "carePlanName",
        p.name AS "planName",
        cust.name AS "customPlanName",
        cc."createdAt" AS "createdAt"
      FROM "CareCase" cc
      JOIN "Elder" e ON cc."elderId" = e.id
      JOIN "User" u ON e."userId" = u.id
      LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
      LEFT JOIN "Subscription" sub ON cc."subscriptionId" = sub.id
      LEFT JOIN "CarePlan" cp ON sub."carePlanId" = cp.id
      LEFT JOIN "Plan" p ON sub."planId" = p.id
      LEFT JOIN "CustomPlanAgreement" cust ON sub."customPlanId" = cust.id
      WHERE ${caseWhere}

      UNION ALL

      SELECT 
        CONCAT('new_sub_', s.id) AS "id",
        CONCAT('new_sub_', s.id) AS "careCaseId",
        true AS "isNewSub",
        e.id AS "elderId",
        e."firstName" AS "elderFirstName",
        e."lastName" AS "elderLastName",
        e.address AS "elderAddress",
        u.name AS "userName",
        mp.salutation AS "profileSalutation",
        mp."memberId" AS "canonicalMemberId",
        mp."firstName" AS "profileFirstName",
        mp."lastName" AS "profileLastName",
        mp."serviceAddress" AS "profileServiceAddress",
        mp."mobileNumber" AS "profileMobile",
        mp."preferredVisitDay" AS "preferredVisitDay",
        mp."preferredVisitTime" AS "preferredVisitTime",
        mp."preferredVisitFrequency" AS "preferredVisitFrequency",
        mp."preferredVisitFortnightlyPattern" AS "preferredVisitFortnightlyPattern",
        s.id AS "subscriptionId",
        s."durationMonths" AS "subDurationMonths",
        s."startDate" AS "subStartDate",
        s."endDate" AS "subEndDate",
        cp.name AS "carePlanName",
        p.name AS "planName",
        cust.name AS "customPlanName",
        s."createdAt" AS "createdAt"
      FROM "Subscription" s
      JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
      LEFT JOIN "Elder" e ON e."userId" = u.id
      LEFT JOIN "CarePlan" cp ON s."carePlanId" = cp.id
      LEFT JOIN "Plan" p ON s."planId" = p.id
      LEFT JOIN "CustomPlanAgreement" cust ON s."customPlanId" = cust.id
      WHERE ${subWhere}
    ) combined
    ORDER BY "createdAt" DESC
    LIMIT 30
  `;

  const rows: any[] = await db.$queryRaw(querySql);

  return rows.map((r) => {
    const elderName = r.elderFirstName
      ? `${r.elderFirstName} ${r.elderLastName || ""}`.trim()
      : r.userName || "Care Recipient";
    const salutation = r.profileSalutation || "Mr";
    const profileFullName = r.profileFirstName
      ? `${salutation} ${r.profileFirstName} ${r.profileLastName || ""}`.trim()
      : null;
    const memberName = profileFullName || r.userName || elderName;
    const memberId = r.canonicalMemberId || "Not assigned";
    const serviceAddress = r.profileServiceAddress || r.elderAddress || "Not available";
    const primaryMobile = r.profileMobile || "Not available";
    const subscribedPlan = formatPlanDisplay({
      durationMonths: r.subDurationMonths,
      startDate: r.subStartDate,
      endDate: r.subEndDate,
      carePlan: r.carePlanName ? { name: r.carePlanName } : null,
      plan: r.planName ? { name: r.planName } : null,
      customPlan: r.customPlanName ? { title: r.customPlanName, name: r.customPlanName } : null,
    });
    const tag = r.isNewSub ? " [New Case]" : "";
    const label = `${memberName}${memberId !== "Not assigned" ? ` (${memberId})` : ""}${tag} – ${subscribedPlan}`;

    const preferredVisitDay = r.preferredVisitDay || null;
    const preferredVisitTime = r.preferredVisitTime || null;
    const preferredVisitFrequency = r.preferredVisitFrequency || null;
    const preferredVisitFortnightlyPattern = r.preferredVisitFortnightlyPattern || null;
    const preferredScheduleDisplay = formatPreferredSchedule(
      preferredVisitDay,
      preferredVisitTime,
      preferredVisitFrequency,
      preferredVisitFortnightlyPattern
    );

    return {
      id: r.id,
      careCaseId: r.careCaseId,
      memberId,
      memberName,
      serviceAddress,
      primaryMobile,
      subscribedPlan,
      elderName,
      elderId: r.elderId,
      label,
      preferredVisitDay,
      preferredVisitTime,
      preferredVisitFrequency,
      preferredVisitFortnightlyPattern,
      preferredScheduleDisplay,
    };
  });
}

/**
 * Server-side searchable employee selector with real-time availability evaluation in Asia/Kolkata (IST).
 * Allows searching by employee name, employee ID, designation, and department.
 * Optimized with parallel database execution, minimal field selection, and single-query conflict checking.
 * Real-time availability calculation detects overlapping care visits and marks occupied employees as unavailable.
 */
export async function searchScheduleEmployees(params: {
  query?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  excludeVisitId?: string;
}): Promise<ScheduleEmployeeSearchResult[]> {
  await requireSchedulePermission(false);

  const q = (params.query || "").trim();
  const terms = q.split(/\s+/).filter(Boolean);

  let whereFilter: any = { status: "ACTIVE" };
  if (terms.length > 0) {
    whereFilter = {
      status: "ACTIVE",
      AND: terms.map((term) => {
        const cleanTerm = term.replace(/[\/\s-]/g, "");
        return {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { employeeId: { contains: term, mode: "insensitive" } },
            ...(cleanTerm && cleanTerm !== term
              ? [{ employeeId: { contains: cleanTerm, mode: "insensitive" } }]
              : []),
            { designation: { contains: term, mode: "insensitive" } },
          ],
        };
      }),
    };
  }

  const scheduledStart = parseISTDateTimeToUTC(params.date, params.startTime);
  const scheduledEnd = parseISTDateTimeToUTC(params.date, params.endTime);
  const isValidInterval =
    !isNaN(scheduledStart.getTime()) && !isNaN(scheduledEnd.getTime()) && scheduledEnd > scheduledStart;

  // Run employee query and blocking visits query concurrently in parallel
  const employeePromise = db.employee.findMany({
    where: whereFilter,
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      designation: true,
      status: true,
    },
    orderBy: { firstName: "asc" },
    take: 30,
  });

  const blockingVisitsPromise: Promise<any[]> = isValidInterval
    ? db.$queryRaw`
        SELECT 
          cv.id,
          cv."assignedEmpId",
          cv."scheduledStart",
          cv."scheduledEnd",
          va."employeeId" AS "assignedRelieverId",
          COALESCE(u.name, TRIM(CONCAT(e."firstName", ' ', e."lastName")), 'Member') AS "memberName"
        FROM "CareVisit" cv
        LEFT JOIN "VisitAssignment" va ON va."visitId" = cv.id
        LEFT JOIN "CareCase" cc ON cv."careCaseId" = cc.id
        LEFT JOIN "Elder" e ON cc."elderId" = e.id
        LEFT JOIN "User" u ON e."userId" = u.id
        WHERE cv.status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
          AND cv."scheduledStart" < ${scheduledEnd}
          AND cv."scheduledEnd" > ${scheduledStart}
          AND (${params.excludeVisitId || null}::text IS NULL OR cv.id != ${params.excludeVisitId || null})
      `
    : Promise.resolve([]);

  const [employees, blockingVisits] = await Promise.all([
    employeePromise,
    blockingVisitsPromise,
  ]);

  return employees.map((emp) => {
    if (!isValidInterval) {
      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        designation: emp.designation,
        department: null,
        status: emp.status,
        available: false,
        conflictReason: "Invalid visit time range.",
      };
    }

    const conflict = blockingVisits.find(
      (v) => v.assignedEmpId === emp.id || v.assignedRelieverId === emp.id
    );

    if (conflict) {
      const timeStr = `${formatTimeIST(conflict.scheduledStart)} – ${formatTimeIST(conflict.scheduledEnd)}`;
      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        designation: emp.designation,
        department: null,
        status: emp.status,
        available: false,
        conflictTime: timeStr,
        conflictReason: `Occupied (${timeStr} for ${conflict.memberName})`,
      };
    }

    return {
      id: emp.id,
      employeeId: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      firstName: emp.firstName,
      lastName: emp.lastName,
      designation: emp.designation,
      department: null,
      status: emp.status,
      available: true,
    };
  });
}

/**
 * Creates a new scheduled care visit with employee assignment, concurrency collision protection, and audit logging.
 */
export async function createScheduleVisit(input: {
  caseSelectionId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  assignedEmpId?: string;
  category?: "Scheduled" | "Ad-hoc";
  occurrenceType?: "RECURRING" | "ADHOC";
  originalVisitId?: string | null;
  operationalNotes?: string;
  status?: string;
}): Promise<{ success: boolean; visitId?: string; error?: string }> {
  const admin = await requireSchedulePermission(true);

  if (!input.caseSelectionId || !input.date || !input.startTime || !input.endTime) {
    return { success: false, error: "Please fill in all required date, time, and case fields." };
  }

  // Parse strictly as Asia/Kolkata date & time to UTC
  const scheduledStart = parseISTDateTimeToUTC(input.date, input.startTime);
  const scheduledEnd = parseISTDateTimeToUTC(input.date, input.endTime);

  if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
    return { success: false, error: "Invalid date or time format." };
  }

  if (scheduledEnd <= scheduledStart) {
    return { success: false, error: "End time must be after start time." };
  }

  try {
    let resolvedCaseId = input.caseSelectionId;

    // Handle new case on the fly if needed
    if (resolvedCaseId.startsWith("new_sub_")) {
      const subId = resolvedCaseId.replace("new_sub_", "");
      const subscription = await db.subscription.findUnique({
        where: { id: subId },
        include: { user: { include: { elders: true, memberProfile: true } } },
      });

      if (!subscription) throw new Error("Subscription not found.");

      let elder = subscription.user.elders[0];
      if (!elder) {
        const nameParts = (subscription.user.name || "Care Recipient").split(" ");
        elder = await db.elder.create({
          data: {
            userId: subscription.user.id,
            firstName: nameParts[0] || "Care",
            lastName: nameParts.slice(1).join(" ") || "Recipient",
            relationship: "Self",
            address: subscription.user.memberProfile?.serviceAddress || null,
          },
        });
      }

      const newCase = await db.careCase.create({
        data: {
          elderId: elder.id,
          subscriptionId: subscription.id,
          startDate: new Date(),
          status: "ACTIVE",
          operationalNotes: "Created via Visit Schedule Calendar",
        },
      });

      resolvedCaseId = newCase.id;
    }

    const category = input.category || "Ad-hoc";
    const occurrenceType = input.occurrenceType || (category === "Scheduled" ? "RECURRING" : "ADHOC");
    let rawNotes = input.operationalNotes || "";
    if (input.originalVisitId && !rawNotes.includes("[Replacement")) {
      rawNotes = `[Replacement for cancelled visit] ${rawNotes}`.trim();
    }
    const formattedNotes = formatNotesWithCategory(category, rawNotes);
    const visitStatus = input.status || "SCHEDULED";

    const visit = await db.$transaction(async (tx) => {
      // Server-side transactional conflict protection
      if (input.assignedEmpId) {
        const emp = await tx.employee.findUnique({
          where: { id: input.assignedEmpId },
          select: { id: true, firstName: true, lastName: true, status: true },
        });

        if (!emp || emp.status !== "ACTIVE") {
          throw new Error("The selected employee is not active or does not exist.");
        }

        const conflict = await tx.careVisit.findFirst({
          where: {
            status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
            scheduledStart: { lt: scheduledEnd },
            scheduledEnd: { gt: scheduledStart },
            OR: [
              { assignedEmpId: input.assignedEmpId },
              { assignments: { some: { employeeId: input.assignedEmpId } } },
            ],
          },
        });

        if (conflict) {
          throw new Error(
            "This employee has already been assigned to another visit during the selected time. Please select another employee."
          );
        }
      }

      const created = await tx.careVisit.create({
        data: {
          careCaseId: resolvedCaseId,
          assignedEmpId: input.assignedEmpId || null,
          scheduledStart,
          scheduledEnd,
          status: visitStatus,
          occurrenceType,
          originalVisitId: input.originalVisitId || null,
          operationalNotes: formattedNotes,
          createdById: admin.userId,
          ...(input.assignedEmpId
            ? {
                assignments: {
                  create: [{ employeeId: input.assignedEmpId }],
                },
              }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "CARE_VISIT_SCHEDULED",
          entityType: "CareVisit",
          entityId: created.id,
          metadata: {
            careCaseId: resolvedCaseId,
            category,
            status: visitStatus,
            scheduledStart: scheduledStart.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
            assignedEmpId: input.assignedEmpId || null,
          },
        },
      });

      return created;
    });

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/care");
    return { success: true, visitId: visit.id };
  } catch (err: any) {
    console.error("[createScheduleVisit] Error:", err);
    return { success: false, error: err?.message || "Failed to schedule visit." };
  }
}

/**
 * Updates full visit details (employee, notes, category, timings, status) with transactional conflict detection.
 */
export async function updateCareVisitDetails(
  visitId: string,
  input: {
    date?: string;
    startTime?: string;
    endTime?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    assignedEmpId?: string | null;
    category?: "Scheduled" | "Ad-hoc";
    operationalNotes?: string;
    status?: string;
    careCaseId?: string;
    caseSelectionId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  const existing = await db.careVisit.findUnique({
    where: { id: visitId },
  });
  if (!existing) return { success: false, error: "Visit not found." };

  const dataToUpdate: any = {};

  if (input.caseSelectionId || input.careCaseId) {
    let targetCaseId = input.caseSelectionId || input.careCaseId!;
    if (targetCaseId.startsWith("new_sub_")) {
      const subId = targetCaseId.replace("new_sub_", "");
      const subscription = await db.subscription.findUnique({
        where: { id: subId },
        include: { user: { include: { elders: true, memberProfile: true } } },
      });
      if (subscription) {
        let elder = subscription.user.elders[0];
        if (!elder) {
          const nameParts = (subscription.user.name || "Care Recipient").split(" ");
          elder = await db.elder.create({
            data: {
              userId: subscription.user.id,
              firstName: nameParts[0] || "Care",
              lastName: nameParts.slice(1).join(" ") || "Recipient",
              relationship: "Self",
              address: subscription.user.memberProfile?.serviceAddress || null,
            },
          });
        }
        const newCase = await db.careCase.create({
          data: {
            elderId: elder.id,
            subscriptionId: subscription.id,
            startDate: new Date(),
            status: "ACTIVE",
            operationalNotes: "Created via Visit Schedule Calendar",
          },
        });
        targetCaseId = newCase.id;
      }
    }
    dataToUpdate.careCaseId = targetCaseId;
  }

  if (input.date && input.startTime && input.endTime) {
    const start = parseISTDateTimeToUTC(input.date, input.startTime);
    const end = parseISTDateTimeToUTC(input.date, input.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { success: false, error: "End time must be after start time." };
    }
    dataToUpdate.scheduledStart = start;
    dataToUpdate.scheduledEnd = end;
  } else if (input.scheduledStart && input.scheduledEnd) {
    const start = parseISTDateTimeToUTC(input.scheduledStart);
    const end = parseISTDateTimeToUTC(input.scheduledEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { success: false, error: "End time must be after start time." };
    }
    dataToUpdate.scheduledStart = start;
    dataToUpdate.scheduledEnd = end;
  }

  if (input.category || input.operationalNotes !== undefined) {
    const existingCat = parseCategory(existing.operationalNotes).category;
    const cat = input.category || existingCat;
    dataToUpdate.operationalNotes = formatNotesWithCategory(cat, input.operationalNotes);
  }

  if (input.status) {
    dataToUpdate.status = input.status;
    if (input.status === "COMPLETED" && !existing.actualEnd) {
      dataToUpdate.actualEnd = new Date();
    } else if (input.status === "IN_PROGRESS" && !existing.actualStart) {
      dataToUpdate.actualStart = new Date();
    }
  }

  if (input.assignedEmpId !== undefined) {
    dataToUpdate.assignedEmpId = input.assignedEmpId || null;
  }

  const targetEmpId = input.assignedEmpId !== undefined ? input.assignedEmpId : existing.assignedEmpId;
  const targetStart = dataToUpdate.scheduledStart || existing.scheduledStart;
  const targetEnd = dataToUpdate.scheduledEnd || existing.scheduledEnd;
  const targetStatus = dataToUpdate.status || existing.status;

  try {
    await db.$transaction(async (tx) => {
      // Conflict checking for assigned employee on active statuses
      if (targetEmpId && ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(targetStatus)) {
        const emp = await tx.employee.findUnique({
          where: { id: targetEmpId },
          select: { id: true, firstName: true, lastName: true, status: true },
        });

        if (!emp || emp.status !== "ACTIVE") {
          throw new Error("The selected employee is not active or does not exist.");
        }

        const conflict = await tx.careVisit.findFirst({
          where: {
            id: { not: visitId },
            status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
            scheduledStart: { lt: targetEnd },
            scheduledEnd: { gt: targetStart },
            OR: [
              { assignedEmpId: targetEmpId },
              { assignments: { some: { employeeId: targetEmpId } } },
            ],
          },
        });

        if (conflict) {
          throw new Error(
            "This employee has already been assigned to another visit during the selected time. Please select another employee."
          );
        }
      }

      await tx.careVisit.update({
        where: { id: visitId },
        data: dataToUpdate,
      });

      if (input.assignedEmpId !== undefined) {
        // Sync assignments table
        await tx.visitAssignment.deleteMany({ where: { visitId } });
        if (input.assignedEmpId) {
          await tx.visitAssignment.create({
            data: { visitId, employeeId: input.assignedEmpId },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "CARE_VISIT_UPDATED",
          entityType: "CareVisit",
          entityId: visitId,
          metadata: {
            changes: dataToUpdate,
            previousStatus: existing.status,
          },
        },
      });
    });

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/care");
    return { success: true };
  } catch (err: any) {
    console.error("[updateCareVisitDetails] Error:", err);
    return { success: false, error: err?.message || "Failed to update visit." };
  }
}

/**
 * Reschedules a visit to a new start/end date and time with conflict detection and optional employee reassignment.
 * Accepts both combined strings (newStartStr, newEndStr) or separate (date, startTime, endTime).
 */
export async function rescheduleCareVisit(
  visitId: string,
  param2: string,
  param3: string,
  param4?: string,
  param5?: string | null,
  param6?: string | null
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  let start: Date;
  let end: Date;
  let reason: string | undefined;
  let assignedEmpId: string | null | undefined;

  // Check if called as: (visitId, date, startTime, endTime, reason?, assignedEmpId?)
  if (
    param4 &&
    !param2.includes("T") &&
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(param2.trim()) &&
    /^\d{1,2}:\d{2}/.test(param3.trim()) &&
    /^\d{1,2}:\d{2}/.test(param4.trim())
  ) {
    start = parseISTDateTimeToUTC(param2, param3);
    end = parseISTDateTimeToUTC(param2, param4);
    reason = typeof param5 === "string" ? param5 : undefined;
    assignedEmpId = param6 !== undefined ? param6 : undefined;
  } else {
    // Standard signature: (visitId, newStartStr, newEndStr, reason?, assignedEmpId?)
    start = parseISTDateTimeToUTC(param2);
    end = parseISTDateTimeToUTC(param3);
    reason = typeof param4 === "string" ? param4 : undefined;
    assignedEmpId = param5 !== undefined ? param5 : undefined;
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { success: false, error: "Invalid reschedule time range. End time must be after start time." };
  }

  const existing = await db.careVisit.findUnique({ where: { id: visitId } });
  if (!existing) return { success: false, error: "Visit not found." };

  const targetEmpId = assignedEmpId !== undefined ? (assignedEmpId || null) : existing.assignedEmpId;

  try {
    await db.$transaction(async (tx) => {
      // Check employee availability if assigned and operationally active
      if (targetEmpId && ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(existing.status)) {
        const emp = await tx.employee.findUnique({
          where: { id: targetEmpId },
          select: { id: true, firstName: true, lastName: true, status: true },
        });

        if (!emp || emp.status !== "ACTIVE") {
          throw new Error("The selected employee is not active or does not exist.");
        }

        const conflict = await tx.careVisit.findFirst({
          where: {
            id: { not: visitId },
            status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
            scheduledStart: { lt: end },
            scheduledEnd: { gt: start },
            OR: [
              { assignedEmpId: targetEmpId },
              { assignments: { some: { employeeId: targetEmpId } } },
            ],
          },
        });

        if (conflict) {
          throw new Error(
            "This employee has already been assigned to another visit during the selected time. Please select another employee."
          );
        }
      }

      const updateData: any = {
        scheduledStart: start,
        scheduledEnd: end,
        operationalNotes: reason
          ? `${existing.operationalNotes || ""}\n[Rescheduled: ${reason}]`.trim()
          : existing.operationalNotes,
      };

      if (assignedEmpId !== undefined) {
        updateData.assignedEmpId = targetEmpId;
      }

      await tx.careVisit.update({
        where: { id: visitId },
        data: updateData,
      });

      if (assignedEmpId !== undefined) {
        await tx.visitAssignment.deleteMany({ where: { visitId } });
        if (targetEmpId) {
          await tx.visitAssignment.create({
            data: { visitId, employeeId: targetEmpId },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "CARE_VISIT_RESCHEDULED",
          entityType: "CareVisit",
          entityId: visitId,
          metadata: {
            previousStart: existing.scheduledStart.toISOString(),
            previousEnd: existing.scheduledEnd.toISOString(),
            newStart: start.toISOString(),
            newEnd: end.toISOString(),
            reason: reason || "Administrative reschedule",
            assignedEmpId: targetEmpId,
          },
        },
      });
    });

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/care");
    return { success: true };
  } catch (err: any) {
    console.error("[rescheduleCareVisit] Error:", err);
    return { success: false, error: err?.message || "Failed to reschedule visit." };
  }
}

/**
 * Quick status change action (Scheduled, Confirmed, Waitlisted, In Progress, Completed, Cancelled).
 */
export async function updateCareVisitStatus(
  visitId: string,
  newStatus: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  const existing = await db.careVisit.findUnique({ where: { id: visitId } });
  if (!existing) return { success: false, error: "Visit not found." };

  const dataToUpdate: any = { status: newStatus };
  if (newStatus === "COMPLETED") {
    if (!existing.completedAt) {
      dataToUpdate.completedAt = new Date();
    }
    if (!existing.completedById) {
      dataToUpdate.completedById = admin.userId;
    }
    if (!existing.actualEnd) {
      dataToUpdate.actualEnd = new Date();
    }
    if (!existing.actualStart) {
      dataToUpdate.actualStart = existing.scheduledStart;
    }
  }
  if (newStatus === "IN_PROGRESS" && !existing.actualStart) {
    dataToUpdate.actualStart = new Date();
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.careVisit.update({
        where: { id: visitId },
        data: dataToUpdate,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "CARE_VISIT_STATUS_CHANGED",
          entityType: "CareVisit",
          entityId: visitId,
          metadata: {
            fromStatus: existing.status,
            toStatus: newStatus,
            note: note || null,
          },
        },
      });
    });

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/care");
    return { success: true };
  } catch (err: any) {
    console.error("[updateCareVisitStatus] Error:", err);
    return { success: false, error: err?.message || "Failed to update visit status." };
  }
}

/**
 * Assigns or reassigns an employee directly to a care visit from the calendar modal.
 */
export async function assignCaregiverDirectly(
  visitId: string,
  employeeId: string | null
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);
  const res = await RecurringSchedulerService.assignEmployeeToVisit({
    visitId,
    employeeId,
    actorUserId: admin.userId,
  });

  if (res.success) {
    revalidatePath("/admin/schedule");
    revalidatePath("/admin/care");
  }

  return res;
}

/**
 * Returns recently cancelled visits for a member case to allow referencing in an Adhoc replacement visit.
 */
export async function getCancelledVisitsForCase(
  caseSelectionId: string
): Promise<Array<{ id: string; scheduledStart: string; cancellationReason: string | null; displayLabel: string }>> {
  await requireSchedulePermission(false);
  if (!caseSelectionId || caseSelectionId.startsWith("new_sub_")) return [];

  const cancelledVisits = await db.careVisit.findMany({
    where: {
      careCaseId: caseSelectionId,
      status: "CANCELLED",
    },
    orderBy: { scheduledStart: "desc" },
    take: 10,
  });

  return cancelledVisits.map((v) => ({
    id: v.id,
    scheduledStart: v.scheduledStart.toISOString(),
    cancellationReason: v.cancellationReason,
    displayLabel: `${formatTimeIST(v.scheduledStart)} (${v.cancellationReason || "Cancelled occurrence"})`,
  }));
}

/**
 * Cancels a visit with audit reason.
 * Crucial: Cancelling an occurrence records the reason and preserves the rest of the recurring series.
 */
export async function cancelCareVisit(
  visitId: string,
  cancellationReason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  const existing = await db.careVisit.findUnique({ where: { id: visitId } });
  if (!existing) return { success: false, error: "Visit not found." };

  const reason = cancellationReason?.trim() || "Administrative cancellation";
  const updatedNotes = `${existing.operationalNotes || ""}\n[Cancelled: ${reason}]`.trim();

  try {
    await db.$transaction(async (tx) => {
      await tx.careVisit.update({
        where: { id: visitId },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          operationalNotes: updatedNotes,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "CARE_VISIT_CANCELLED",
          entityType: "CareVisit",
          entityId: visitId,
          metadata: {
            previousStatus: existing.status,
            reason,
            occurrenceType: existing.occurrenceType,
          },
        },
      });
    });

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/care");
    return { success: true };
  } catch (err: any) {
    console.error("[cancelCareVisit] Error:", err);
    return { success: false, error: err?.message || "Failed to cancel visit." };
  }
}

/**
 * Fetch dedicated, automatically populated Birthday Calendar data.
 * Authoritative source: MemberProfile (Primary members and spouses with confirmed Member ID).
 */
export async function getBirthdayCalendarEntries(
  referenceDate?: string
): Promise<BirthdayCalendarPayload> {
  await requireSchedulePermission(false);
  return BirthdayCalendarService.getBirthdayCalendarData(referenceDate, db);
}

