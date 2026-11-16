"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import {
  parseISTDateTimeToUTC,
  formatTimeIST,
} from "@/components/admin/schedule/schedule-date-utils";

export interface ScheduleVisitDTO {
  id: string;
  careCaseId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  status: string;
  category: "Scheduled" | "Ad-hoc";
  operationalNotes?: string | null;

  member: {
    userId: string;
    name: string;
    email: string;
    memberId: string | null;
    serviceAddress: string | null;
    mobileNumber: string | null;
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

export interface CareScheduleFormData {
  cases: Array<{
    id: string;
    careCaseId: string;
    label: string;
    memberName: string;
    memberId: string | null;
    elderName: string;
    serviceAddress: string | null;
  }>;
  employees: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    displayName: string;
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

    dtoList.push({
      id: v.id,
      careCaseId: v.careCaseId,
      scheduledStart: v.scheduledStart.toISOString(),
      scheduledEnd: v.scheduledEnd.toISOString(),
      actualStart: v.actualStart ? v.actualStart.toISOString() : null,
      actualEnd: v.actualEnd ? v.actualEnd.toISOString() : null,
      status: v.status,
      category: parsedCat.category,
      operationalNotes: parsedCat.cleanNotes || v.operationalNotes,
      member: {
        userId: memberUser?.id || "",
        name: memberName,
        email: memberUser?.email || "",
        memberId: profile?.memberId || null,
        serviceAddress: profile?.serviceAddress || elder?.address || null,
        mobileNumber: profile?.mobileNumber || elder?.contactNumber || null,
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

  return dtoList;
}

/**
 * Returns available cases (active subscriptions / elders) and active employees for scheduling modals.
 */
export async function getCareScheduleFormData(): Promise<CareScheduleFormData> {
  await requireSchedulePermission(false);

  const [activeCases, activeEmployees, activeSubscriptionsWithoutCase] = await Promise.all([
    db.careCase.findMany({
      where: { status: "ACTIVE" },
      include: {
        elder: {
          include: {
            user: {
              include: { memberProfile: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
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
    db.subscription.findMany({
      where: {
        status: "ACTIVE",
        careCases: { none: {} },
      },
      include: {
        user: {
          include: { memberProfile: true, elders: true },
        },
      },
    }),
  ]);

  const casesOptions: CareScheduleFormData["cases"] = [];

  for (const c of activeCases) {
    const elder = c.elder;
    const member = elder?.user;
    const profile = member?.memberProfile;
    const elderName = elder ? `${elder.firstName} ${elder.lastName}`.trim() : "Elder";
    const memberName = member?.name || elderName;
    const memberId = profile?.memberId || null;
    const label = memberId ? `${elderName} (${memberId})` : `${elderName} — ${member?.email || ""}`;

    casesOptions.push({
      id: c.id,
      careCaseId: c.id,
      label,
      memberName,
      memberId,
      elderName,
      serviceAddress: profile?.serviceAddress || elder?.address || null,
    });
  }

  // Ensure members with active subscriptions without a case can also be selected (case created on the fly)
  for (const sub of activeSubscriptionsWithoutCase) {
    const user = sub.user;
    const profile = user.memberProfile;
    const memberName = user.name || "Member";
    const memberId = profile?.memberId || null;
    const label = memberId ? `${memberName} (${memberId}) [New Case]` : `${memberName} — ${user.email} [New Case]`;

    casesOptions.push({
      id: `new_sub_${sub.id}`,
      careCaseId: `new_sub_${sub.id}`,
      label,
      memberName,
      memberId,
      elderName: memberName,
      serviceAddress: profile?.serviceAddress || null,
    });
  }

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

  return employees.map((emp) => {
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
 * Creates a new scheduled care visit with employee assignment, concurrency collision protection, and audit logging.
 */
export async function createScheduleVisit(input: {
  caseSelectionId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  assignedEmpId?: string;
  category?: "Scheduled" | "Ad-hoc";
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

    const category = input.category || "Scheduled";
    const formattedNotes = formatNotesWithCategory(category, input.operationalNotes);
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
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  const existing = await db.careVisit.findUnique({
    where: { id: visitId },
  });
  if (!existing) return { success: false, error: "Visit not found." };

  const dataToUpdate: any = {};

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
 */
export async function rescheduleCareVisit(
  visitId: string,
  newStartStr: string,
  newEndStr: string,
  reason?: string,
  assignedEmpId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  // Parse strictly as Asia/Kolkata date & time to UTC
  const start = parseISTDateTimeToUTC(newStartStr);
  const end = parseISTDateTimeToUTC(newEndStr);
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
  if (newStatus === "COMPLETED" && !existing.actualEnd) {
    dataToUpdate.actualEnd = new Date();
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
 * Cancels a visit with audit reason.
 */
export async function cancelCareVisit(
  visitId: string,
  cancellationReason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireSchedulePermission(true);

  const existing = await db.careVisit.findUnique({ where: { id: visitId } });
  if (!existing) return { success: false, error: "Visit not found." };

  const updatedNotes = cancellationReason
    ? `${existing.operationalNotes || ""}\n[Cancelled: ${cancellationReason}]`.trim()
    : existing.operationalNotes;

  try {
    await db.$transaction(async (tx) => {
      await tx.careVisit.update({
        where: { id: visitId },
        data: {
          status: "CANCELLED",
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
            reason: cancellationReason || "Administrative cancellation",
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
