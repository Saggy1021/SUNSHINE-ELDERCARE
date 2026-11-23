/**
 * Sunshine Eldercare — Automated Recurring Care Visit Scheduler Service
 *
 * Handles:
 * 1. Timezone-safe Asia/Kolkata (IST) date generation for Weekly and Fortnightly recurrence patterns.
 * 2. Fortnightly occurrence calculations:
 *    - Week 1 and Week 3: 1st and 3rd occurrence of the weekday in each calendar month.
 *    - Week 2 and Week 4: 2nd and 4th occurrence of the weekday in each calendar month.
 *    - Months with 5 occurrences: The 5th occurrence is strictly skipped for both patterns to avoid unintended visits.
 * 3. Rolling 90-day scheduling horizon.
 * 4. Idempotent, transaction-safe generation preventing duplicate records.
 * 5. Subscription eligibility validation (Active status, entitlement checks, date bounds).
 * 6. Conflict-free synchronization when member preferences change (protecting historical, completed, cancelled, and individually rescheduled visits).
 * 7. Adhoc visit scheduling with replacement references.
 * 8. Strict chronological visit ordering.
 */

import { db as defaultDb } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  formatDateKey,
  getKolkataDateParts,
  parseISTDateTimeToUTC,
} from "@/components/admin/schedule/schedule-date-utils";
import {
  normalize12HourTime,
  to24HourTime,
  PreferredVisitDay,
  PREFERRED_VISIT_DAYS,
  VisitFrequency,
  FortnightlyPattern,
} from "@/lib/services/preferred-schedule";

// In-flight concurrency lock per member to safely serialize concurrent operations
const activeMemberLocks = new Map<string, Promise<any>>();

export async function withMemberLock<T>(memberKey: string, fn: () => Promise<T>): Promise<T> {
  while (activeMemberLocks.has(memberKey)) {
    try {
      await activeMemberLocks.get(memberKey);
    } catch {
      // ignore errors from previous lock holder
    }
  }

  let resolveLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });

  activeMemberLocks.set(memberKey, lockPromise);

  try {
    return await fn();
  } finally {
    activeMemberLocks.delete(memberKey);
    resolveLock!();
  }
}

let activeDb: any = defaultDb;

export function setSchedulerDb(customDb?: any) {
  activeDb = customDb || defaultDb;
}

export function getSchedulerDb(): typeof defaultDb {
  return activeDb;
}

export interface RecurringScheduleParams {
  preferredVisitDay: string;
  preferredVisitTime: string;
  preferredVisitFrequency?: VisitFrequency | string | null;
  preferredVisitFortnightlyPattern?: FortnightlyPattern | string | null;
  startDate?: Date | string;
  endDate?: Date | string | null;
  horizonDays?: number;
}

export interface GeneratedVisitOccurrence {
  dateKey: string; // YYYY-MM-DD
  scheduledStart: Date;
  scheduledEnd: Date;
  weekday: string;
  dayOfMonth: number;
  weekdayOccurrenceIndex: number; // 1 to 5
}

export class RecurringSchedulerService {
  /**
   * Calculates the occurrence index (1st, 2nd, 3rd, 4th, 5th) of a weekday in its calendar month.
   *
   * Mathematical Rule:
   * Each weekday occurs once every 7 days. Thus:
   * Days 1–7   -> 1st occurrence (occurrence 1)
   * Days 8–14  -> 2nd occurrence (occurrence 2)
   * Days 15–21 -> 3rd occurrence (occurrence 3)
   * Days 22–28 -> 4th occurrence (occurrence 4)
   * Days 29–31 -> 5th occurrence (occurrence 5)
   *
   * Formula: Math.floor((dayOfMonth - 1) / 7) + 1
   */
  public static getWeekdayOccurrenceIndex(dayOfMonth: number): number {
    if (dayOfMonth < 1 || dayOfMonth > 31) return 1;
    return Math.floor((dayOfMonth - 1) / 7) + 1;
  }

  /**
   * Evaluates if a given date matches the recurrence pattern:
   * - WEEKLY: matches every occurrence of preferredVisitDay
   * - FORTNIGHTLY with WEEK_1_3: matches 1st and 3rd occurrence of preferredVisitDay
   * - FORTNIGHTLY with WEEK_2_4: matches 2nd and 4th occurrence of preferredVisitDay
   * Note: Months with 5 occurrences of a weekday are strictly ignored for both fortnightly patterns.
   */
  public static matchesRecurrencePattern(params: {
    targetDate: Date;
    preferredVisitDay: string;
    preferredVisitFrequency?: string | null;
    preferredVisitFortnightlyPattern?: string | null;
  }): boolean {
    const { targetDate, preferredVisitDay, preferredVisitFrequency, preferredVisitFortnightlyPattern } = params;

    // Get IST weekday name
    const weekdayName = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
    }).format(targetDate);

    if (weekdayName.toLowerCase() !== preferredVisitDay.trim().toLowerCase()) {
      return false;
    }

    const frequency = (preferredVisitFrequency || "WEEKLY").toUpperCase();
    if (frequency === "WEEKLY") {
      return true;
    }

    if (frequency === "FORTNIGHTLY") {
      const { day } = getKolkataDateParts(targetDate);
      const occurrence = this.getWeekdayOccurrenceIndex(day);

      const pattern = (preferredVisitFortnightlyPattern || "WEEK_1_3").toUpperCase();
      if (pattern === "WEEK_1_3") {
        return occurrence === 1 || occurrence === 3;
      }
      if (pattern === "WEEK_2_4") {
        return occurrence === 2 || occurrence === 4;
      }
    }

    return false;
  }

  /**
   * Generates prospective visit occurrences within the scheduling window.
   */
  public static calculateRecurringDates(params: RecurringScheduleParams): GeneratedVisitOccurrence[] {
    const {
      preferredVisitDay,
      preferredVisitTime,
      preferredVisitFrequency = "WEEKLY",
      preferredVisitFortnightlyPattern = "WEEK_1_3",
      horizonDays = 90,
    } = params;

    if (!preferredVisitDay || !preferredVisitTime) {
      return [];
    }

    const time24 = to24HourTime(preferredVisitTime);
    if (!time24) return [];

    // Parse start and end bounds in IST
    const nowParts = getKolkataDateParts(new Date());
    const startISTStr = params.startDate
      ? formatDateKey(params.startDate)
      : `${nowParts.year}-${String(nowParts.month).padStart(2, "0")}-${String(nowParts.day).padStart(2, "0")}`;

    // Anchor startDate to start of day in IST (00:00:00 IST = 18:30 UTC of previous day)
    const startDateAnchor = parseISTDateTimeToUTC(startISTStr, "00:00");

    let maxEndDate = new Date(startDateAnchor.getTime() + horizonDays * 24 * 3600 * 1000);
    if (params.endDate) {
      const subEndDate = typeof params.endDate === "string" ? new Date(params.endDate) : params.endDate;
      if (!isNaN(subEndDate.getTime()) && subEndDate < maxEndDate) {
        maxEndDate = subEndDate;
      }
    }

    const occurrences: GeneratedVisitOccurrence[] = [];

    // Iterate day-by-day from start date up to maxEndDate
    const iterDate = new Date(startDateAnchor);
    while (iterDate <= maxEndDate) {
      const matches = this.matchesRecurrencePattern({
        targetDate: iterDate,
        preferredVisitDay,
        preferredVisitFrequency,
        preferredVisitFortnightlyPattern,
      });

      if (matches) {
        const dateKey = formatDateKey(iterDate);
        const scheduledStart = parseISTDateTimeToUTC(dateKey, time24);
        // Default visit length is 1 hour (60 minutes)
        const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);

        // Ensure within bounds
        if (scheduledStart >= startDateAnchor && scheduledStart <= maxEndDate) {
          const { day } = getKolkataDateParts(iterDate);
          const occurrenceIndex = this.getWeekdayOccurrenceIndex(day);
          const weekdayName = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
          }).format(iterDate);

          occurrences.push({
            dateKey,
            scheduledStart,
            scheduledEnd,
            weekday: weekdayName,
            dayOfMonth: day,
            weekdayOccurrenceIndex: occurrenceIndex,
          });
        }
      }

      // Advance by 1 calendar day
      iterDate.setDate(iterDate.getDate() + 1);
    }

    return occurrences;
  }

  /**
   * Validates if a subscription entitles the member to recurring care visits.
   */
  public static isSubscriptionEligibleForVisits(subscription: {
    status: string;
    startDate?: Date | null;
    endDate?: Date | null;
    carePlan?: { slug: string; name: string; variants?: Array<{ services?: Array<{ serviceName: string; serviceNote?: string | null }> }> } | null;
    plan?: { slug: string; name: string } | null;
    customPlan?: { title?: string; name?: string; description?: string | null; includedServices?: any } | null;
  } | null): { eligible: boolean; reason?: string } {
    if (!subscription) {
      return { eligible: false, reason: "No subscription found." };
    }

    if (subscription.status !== "ACTIVE") {
      return { eligible: false, reason: `Subscription is not active (current status: ${subscription.status}).` };
    }

    const now = new Date();
    if (subscription.endDate && subscription.endDate < now) {
      return { eligible: false, reason: "Subscription has expired." };
    }

    // Inspect care plan services
    const planSlug = (subscription.carePlan?.slug || subscription.plan?.slug || "").toLowerCase();
    const planName = (subscription.carePlan?.name || subscription.plan?.name || subscription.customPlan?.name || subscription.customPlan?.title || "").toLowerCase();

    // Packages with recurring visits
    if (planSlug === "shield-shine" || planName.includes("shield shine")) {
      return { eligible: true };
    }
    if (planSlug === "semi-shield-shine" || planName.includes("semi shield shine")) {
      return { eligible: true };
    }

    // Check variants / services
    if (subscription.carePlan?.variants) {
      for (const variant of subscription.carePlan.variants) {
        if (variant.services) {
          for (const service of variant.services) {
            const sn = (service.serviceName || "").toLowerCase();
            const note = (service.serviceNote || "").toLowerCase();
            if (sn.includes("visit") || note.includes("visit") || note.includes("outdoor")) {
              return { eligible: true };
            }
          }
        }
      }
    }

    // Life line care has no recurring care visits
    if (planSlug === "life-line-care" || planName.includes("life line care")) {
      return { eligible: false, reason: "Life Line Care package does not include regular recurring care visits." };
    }

    // Check custom plan agreements
    if (subscription.customPlan) {
      const inc = JSON.stringify(subscription.customPlan.includedServices || "").toLowerCase();
      if (inc.includes("visit") || planName.includes("care") || planName.includes("visit")) {
        return { eligible: true };
      }
    }

    // Default to false for packages without visits
    return { eligible: false, reason: `Plan ${planName || "Unknown"} is not entitled to automated recurring visits.` };
  }

  /**
   * Automatically generates recurring visits for a member for the rolling 90-day horizon.
   * Transactional and idempotent: avoids duplicate visits if already created for that day.
   */
  public static async generateRecurringVisitsForMember(params: {
    userId?: string;
    memberProfileId?: string;
    horizonDays?: number;
    actorUserId?: string;
  }): Promise<{ success: boolean; generated: number; skipped: number; reason?: string }> {
    const lockKey = params.memberProfileId || params.userId || "global";
    return withMemberLock(lockKey, async () => {
      const currentDb = getSchedulerDb();
      const profile = await currentDb.memberProfile.findFirst({
      where: params.memberProfileId ? { id: params.memberProfileId } : { userId: params.userId },
      include: {
        user: {
          include: {
            elders: true,
            subscriptions: {
              where: { status: "ACTIVE" },
              include: {
                carePlan: {
                  include: {
                    variants: {
                      include: {
                        services: true,
                      },
                    },
                  },
                },
                plan: true,
                customPlan: true,
                careCases: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!profile) {
      return { success: false, generated: 0, skipped: 0, reason: "Member profile not found." };
    }

    if (!profile.preferredVisitDay || !profile.preferredVisitTime) {
      return {
        success: false,
        generated: 0,
        skipped: 0,
        reason: "Member does not have a preferred visit day or time configured.",
      };
    }

    const activeSub = profile.user.subscriptions[0];
    const eligibility = this.isSubscriptionEligibleForVisits(activeSub);
    if (!eligibility.eligible) {
      return {
        success: false,
        generated: 0,
        skipped: 0,
        reason: eligibility.reason,
      };
    }

    // Ensure active CareCase exists
    let careCase = activeSub.careCases.find((c) => c.status === "ACTIVE");
    if (!careCase) {
      let elder = profile.user.elders[0];
      if (!elder) {
        elder = await currentDb.elder.create({
          data: {
            userId: profile.userId,
            firstName: profile.firstName || "Care",
            lastName: profile.lastName || "Recipient",
            relationship: "Self",
            address: profile.serviceAddress || null,
          },
        });
      }

      careCase = await currentDb.careCase.create({
        data: {
          elderId: elder.id,
          subscriptionId: activeSub.id,
          startDate: activeSub.startDate || new Date(),
          endDate: activeSub.endDate,
          status: "ACTIVE",
          operationalNotes: "Automated Care Case for Recurring Scheduler",
        },
      });
    }

    // Calculate prospective target dates
    const horizonDays = params.horizonDays || 90;
    const prospectiveVisits = this.calculateRecurringDates({
      preferredVisitDay: profile.preferredVisitDay,
      preferredVisitTime: profile.preferredVisitTime,
      preferredVisitFrequency: (profile.preferredVisitFrequency as VisitFrequency) || "WEEKLY",
      preferredVisitFortnightlyPattern: (profile.preferredVisitFortnightlyPattern as FortnightlyPattern) || "WEEK_1_3",
      startDate: activeSub.startDate || new Date(),
      endDate: activeSub.endDate,
      horizonDays,
    });

    if (prospectiveVisits.length === 0) {
      return { success: true, generated: 0, skipped: 0, reason: "No prospective dates in window." };
    }

    // Query existing visits for this careCase
    const minStart = prospectiveVisits[0].scheduledStart;
    const maxEnd = prospectiveVisits[prospectiveVisits.length - 1].scheduledEnd;

    // Buffer query slightly
    const existingVisits = await currentDb.careVisit.findMany({
      where: {
        careCaseId: careCase.id,
        scheduledStart: {
          gte: new Date(minStart.getTime() - 24 * 3600 * 1000),
          lte: new Date(maxEnd.getTime() + 24 * 3600 * 1000),
        },
      },
      select: {
        id: true,
        scheduledStart: true,
        status: true,
        occurrenceType: true,
      },
    });

    // Create a Set of existing IST date keys
    const existingDateKeys = new Set(existingVisits.map((v) => formatDateKey(v.scheduledStart)));

    const visitsToCreate = prospectiveVisits.filter((p) => !existingDateKeys.has(p.dateKey));
    let createdCount = 0;

    if (visitsToCreate.length > 0) {
      await currentDb.$transaction(async (tx: any) => {
        for (const v of visitsToCreate) {
          // Double-check inside transaction to prevent concurrency race conditions
          const existing = await tx.careVisit.findFirst({
            where: {
              careCaseId: careCase.id,
              scheduledStart: v.scheduledStart,
            },
            select: { id: true },
          });

          if (!existing) {
            await tx.careVisit.create({
              data: {
                careCaseId: careCase.id,
                scheduledStart: v.scheduledStart,
                scheduledEnd: v.scheduledEnd,
                status: "SCHEDULED",
                occurrenceType: "RECURRING",
                operationalNotes: "[Scheduled] Automated Recurring Care Visit",
                isIndividuallyRescheduled: false,
                createdById: params.actorUserId || null,
              },
            });
            createdCount++;
          }
        }
      });
    }

    return {
      success: true,
      generated: createdCount,
      skipped: prospectiveVisits.length - createdCount,
    };
    });
  }

  /**
   * Synchronizes future recurring visits when a member's visit preferences change.
   *
   * Protection Rules:
   * - Historical visits (scheduledStart < now): NEVER modified.
   * - Completed visits (status === 'COMPLETED'): NEVER modified.
   * - In-Progress visits (status === 'IN_PROGRESS'): NEVER modified.
   * - Cancelled visits (status === 'CANCELLED'): NEVER modified.
   * - Individually rescheduled visits (isIndividuallyRescheduled === true): NEVER modified.
   * - Only future, uncommenced recurring visits (status === 'SCHEDULED', isIndividuallyRescheduled === false, actualStart === null) are updated.
   */
  public static async syncRecurringVisitsOnPreferenceChange(params: {
    memberProfileId: string;
    newPreferredDay?: string | null;
    newPreferredTime?: string | null;
    newFrequency?: string | null;
    newFortnightlyPattern?: string | null;
    actorUserId?: string;
  }): Promise<{ success: boolean; updated: number; removed: number; added: number; error?: string }> {
    const lockKey = params.memberProfileId;
    return withMemberLock(lockKey, async () => {
      const currentDb = getSchedulerDb();
      const profile = await currentDb.memberProfile.findUnique({
      where: { id: params.memberProfileId },
      include: {
        user: {
          include: {
            subscriptions: {
              where: { status: "ACTIVE" },
              include: {
                carePlan: {
                  include: {
                    variants: {
                      include: {
                        services: true,
                      },
                    },
                  },
                },
                plan: true,
                customPlan: true,
                careCases: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!profile) {
      return { success: false, updated: 0, removed: 0, added: 0, error: "Member profile not found." };
    }

    const preferredDay = params.newPreferredDay !== undefined ? params.newPreferredDay : profile.preferredVisitDay;
    const preferredTime = params.newPreferredTime !== undefined ? params.newPreferredTime : profile.preferredVisitTime;
    const preferredFrequency = params.newFrequency !== undefined ? params.newFrequency : profile.preferredVisitFrequency;
    const preferredPattern = params.newFortnightlyPattern !== undefined ? params.newFortnightlyPattern : profile.preferredVisitFortnightlyPattern;

    if (!preferredDay || !preferredTime) {
      return { success: true, updated: 0, removed: 0, added: 0 };
    }

    const activeSub = profile.user.subscriptions[0];
    const eligibility = this.isSubscriptionEligibleForVisits(activeSub);
    if (!eligibility.eligible) {
      return { success: true, updated: 0, removed: 0, added: 0 };
    }

    const careCase = activeSub.careCases?.find((c: any) => c.status === "ACTIVE");
    if (!careCase) {
      // If no care case yet, generate brand new schedule
      const genRes = await this.generateRecurringVisitsForMember({
        memberProfileId: profile.id,
        actorUserId: params.actorUserId,
      });
      return { success: true, updated: 0, removed: 0, added: genRes.generated };
    }

    const now = new Date();

    // Query all future visits for this careCase
    const futureVisits = await currentDb.careVisit.findMany({
      where: {
        careCaseId: careCase.id,
        scheduledStart: { gt: now },
      },
      orderBy: { scheduledStart: "asc" },
    });

    // Partition visits into protected vs eligible for modification
    const protectedVisits = futureVisits.filter((v: any) => {
      return (
        v.status === "COMPLETED" ||
        v.status === "CANCELLED" ||
        v.status === "IN_PROGRESS" ||
        v.isIndividuallyRescheduled === true ||
        v.actualStart !== null ||
        v.occurrenceType === "ADHOC"
      );
    });

    const eligibleVisits = futureVisits.filter((v: any) => {
      return (
        v.status === "SCHEDULED" &&
        v.occurrenceType === "RECURRING" &&
        v.isIndividuallyRescheduled === false &&
        v.actualStart === null
      );
    });

    // Calculate new target occurrences for the next 90 days
    const targetOccurrences = this.calculateRecurringDates({
      preferredVisitDay: preferredDay,
      preferredVisitTime: preferredTime,
      preferredVisitFrequency: preferredFrequency,
      preferredVisitFortnightlyPattern: preferredPattern,
      startDate: now,
      endDate: activeSub.endDate,
      horizonDays: 90,
    });

    const targetDateKeyMap = new Map<string, GeneratedVisitOccurrence>();
    for (const occ of targetOccurrences) {
      targetDateKeyMap.set(occ.dateKey, occ);
    }

    // Set of protected date keys that must not be disrupted
    const protectedDateKeys = new Set(protectedVisits.map((v: any) => formatDateKey(v.scheduledStart)));

    let removed = 0;
    let added = 0;
    let updated = 0;

    await currentDb.$transaction(async (tx: any) => {
      // 1. Process existing eligible visits
      const remainingEligibleDates = new Set<string>();

      for (const ev of eligibleVisits) {
        const evDateKey = formatDateKey(ev.scheduledStart);
        const matchingTarget = targetDateKeyMap.get(evDateKey);

        if (!matchingTarget) {
          // This visit's date no longer matches the new recurrence pattern. Remove it.
          await tx.careVisit.delete({ where: { id: ev.id } });
          removed++;
        } else {
          // Date matches. Check if time changed.
          if (
            ev.scheduledStart.getTime() !== matchingTarget.scheduledStart.getTime() ||
            ev.scheduledEnd.getTime() !== matchingTarget.scheduledEnd.getTime()
          ) {
            await tx.careVisit.update({
              where: { id: ev.id },
              data: {
                scheduledStart: matchingTarget.scheduledStart,
                scheduledEnd: matchingTarget.scheduledEnd,
              },
            });
            updated++;
          }
          remainingEligibleDates.add(evDateKey);
        }
      }

      // 2. Add occurrences that do not exist yet and are not in protected dates
      for (const occ of targetOccurrences) {
        if (!remainingEligibleDates.has(occ.dateKey) && !protectedDateKeys.has(occ.dateKey)) {
          await tx.careVisit.create({
            data: {
              careCaseId: careCase.id,
              scheduledStart: occ.scheduledStart,
              scheduledEnd: occ.scheduledEnd,
              status: "SCHEDULED",
              occurrenceType: "RECURRING",
              operationalNotes: "[Scheduled] Automated Recurring Care Visit",
              isIndividuallyRescheduled: false,
              createdById: params.actorUserId || null,
            },
          });
          added++;
        }
      }
    });

    return {
      success: true,
      updated,
      removed,
      added,
    };
    });
  }

  /**
   * Assigns an employee to a scheduled visit with conflict checking and audit log.
   */
  public static async assignEmployeeToVisit(params: {
    visitId: string;
    employeeId: string | null;
    actorUserId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const currentDb = getSchedulerDb();
    const visit = await currentDb.careVisit.findUnique({
      where: { id: params.visitId },
    });

    if (!visit) {
      return { success: false, error: "Visit not found." };
    }

    if (params.employeeId) {
      const emp = await currentDb.employee.findUnique({
        where: { id: params.employeeId },
      });
      if (!emp || emp.status !== "ACTIVE") {
        return { success: false, error: "The selected employee is not active." };
      }

      // Conflict checking
      const conflict = await currentDb.careVisit.findFirst({
        where: {
          id: { not: params.visitId },
          status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
          scheduledStart: { lt: visit.scheduledEnd },
          scheduledEnd: { gt: visit.scheduledStart },
          OR: [
            { assignedEmpId: params.employeeId },
            { assignments: { some: { employeeId: params.employeeId } } },
          ],
        },
      });

      if (conflict) {
        return {
          success: false,
          error: "This employee already has a scheduled visit at this time.",
        };
      }
    }

    await currentDb.$transaction(async (tx: any) => {
      await tx.careVisit.update({
        where: { id: params.visitId },
        data: {
          assignedEmpId: params.employeeId || null,
        },
      });

      await tx.visitAssignment.deleteMany({ where: { visitId: params.visitId } });
      if (params.employeeId) {
        await tx.visitAssignment.create({
          data: {
            visitId: params.visitId,
            employeeId: params.employeeId,
          },
        });
      }

      if (params.actorUserId) {
        await tx.auditLog.create({
          data: {
            actorUserId: params.actorUserId,
            action: params.employeeId ? "CARE_VISIT_EMPLOYEE_ASSIGNED" : "CARE_VISIT_EMPLOYEE_UNASSIGNED",
            entityType: "CareVisit",
            entityId: params.visitId,
            metadata: {
              assignedEmpId: params.employeeId,
              previousAssignedEmpId: visit.assignedEmpId,
            },
          },
        });
      }
    });

    return { success: true };
  }

  /**
   * Sorts visits in strictly chronological order based on scheduledStart.
   */
  public static getVisitsChronologicalOrder<T extends { scheduledStart: Date | string }>(visits: T[]): T[] {
    return [...visits].sort((a, b) => {
      const timeA = new Date(a.scheduledStart).getTime();
      const timeB = new Date(b.scheduledStart).getTime();
      return timeA - timeB;
    });
  }
}
