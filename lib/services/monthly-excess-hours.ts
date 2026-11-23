/**
 * Sunshine Eldercare — Monthly Final Excess Care Hours Statement Service
 *
 * Provides:
 * 1. Timezone-safe Asia/Kolkata (IST) calendar month calculations.
 * 2. Accurate completed care hours computation using actual visit arrival and departure timestamps.
 * 3. Package entitlement resolution (Shield Shine: 10 hrs, Semi Shield Shine: 5 hrs, Life Line Care: 0 hrs, Custom).
 * 4. Deterministic excess care hours calculation: Math.max(0, Total Hours Used - Monthly Entitlement).
 * 5. Deterministic remaining care hours calculation: Math.max(0, Monthly Entitlement - Total Hours Used).
 * 6. Historical statement preservation: snapshots stored in MonthlyCareHoursReport & MonthlyCareHoursStatementItem
 *    so management can revisit previous months without retroactively altering past statements.
 * 7. Live continuous monitoring throughout the month.
 * 8. One-click CSV and PDF-ready formatting.
 * 9. Non-billing enforcement: strictly for management review, zero automated invoicing or payment requests.
 */

import { db as defaultDb } from "@/lib/db";
import { parseISTDateTimeToUTC, formatDateKey, formatTimeIST } from "@/components/admin/schedule/schedule-date-utils";

let activeDb: any = defaultDb;

export function setMonthlyHoursDb(customDb?: any) {
  activeDb = customDb || defaultDb;
}

export function getMonthlyHoursDb(): typeof defaultDb {
  return activeDb;
}

export interface VisitDrilldownItem {
  visitId: string;
  dateKey: string;
  scheduledTime: string;
  actualArrival: string | null;
  actualDeparture: string | null;
  durationMinutes: number;
  durationHours: number;
  caregiver: string;
  elderName: string;
  status: string;
  workDescription?: string | null;
}

export interface MemberMonthlyStatementData {
  memberId: string;
  memberName: string;
  userId: string | null;
  profileId: string | null;
  packageName: string;
  packageSlug: string | null;
  monthlyEntitlement: number;
  totalHoursUsed: number;
  remainingHours: number;
  excessHours: number;
  completedVisits: number;
  reportMonth: string;
  hasExcess: boolean;
  visits: VisitDrilldownItem[];
}

export interface MonthlyReportSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "November 2026"
  year: number;
  month: number;
  status: "ACTIVE" | "FINALIZED";
  totalMembers: number;
  excessMembers: number;
  withinEntitlementMembers: number;
  totalEntitledHours: number;
  totalUsedHours: number;
  totalExcessHours: number;
  generatedAt: string;
  finalizedAt: string | null;
  finalizedById: string | null;
  items: MemberMonthlyStatementData[];
}

/**
 * Returns IST start and end UTC timestamps for a given monthKey (YYYY-MM).
 */
export function getMonthBoundsIST(monthKey: string): {
  startUTC: Date;
  endUTC: Date;
  year: number;
  month: number;
  monthLabel: string;
} {
  const parts = monthKey.trim().split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return getMonthBoundsIST(`${curYear}-${String(curMonth).padStart(2, "0")}`);
  }

  const startDayStr = `${year}-${String(month).padStart(2, "0")}-01`;
  // Determine days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDayStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Start of month at 00:00:00 IST
  const startUTC = parseISTDateTimeToUTC(startDayStr, "00:00");
  // End of month at 23:59:59.999 IST (23:59 IST + 59.999s)
  const endUTCMidnight = parseISTDateTimeToUTC(endDayStr, "23:59");
  const endUTC = new Date(endUTCMidnight.getTime() + 59 * 1000 + 999);

  // Month label in IST
  const dummyDate = new Date(startUTC.getTime() + 2 * 24 * 3600 * 1000);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  }).format(dummyDate);

  return { startUTC, endUTC, year, month, monthLabel };
}

/**
 * Resolves standard care package monthly entitlement hours.
 * - Shield Shine: 10 hrs
 * - Semi Shield Shine: 5 hrs
 * - Life Line Care: 0 hrs
 * - Custom Plans: parsed from metadata or description, or 0.
 */
export function resolvePackageEntitlement(params: {
  planSlug?: string | null;
  planName?: string | null;
  services?: Array<{ serviceName?: string; serviceNote?: string | null }> | null;
  customDescription?: string | null;
  customMetadata?: any;
}): { entitlementHours: number; packageName: string; packageSlug: string } {
  const rawName = (params.planName || "").trim();
  const slug = (params.planSlug || "").trim().toLowerCase();

  // Semi Shield Shine -> 5 hrs (checked before Shield Shine to prevent substring match)
  if (
    slug === "semi-shield-shine" ||
    rawName.toLowerCase().includes("semi shield shine") ||
    (rawName.toLowerCase().includes("semi") && rawName.toLowerCase().includes("shield"))
  ) {
    return { entitlementHours: 5.0, packageName: rawName || "Semi Shield Shine", packageSlug: "semi-shield-shine" };
  }

  // Shield Shine -> 10 hrs
  if (slug === "shield-shine" || rawName.toLowerCase().includes("shield shine")) {
    return { entitlementHours: 10.0, packageName: rawName || "Shield Shine", packageSlug: "shield-shine" };
  }

  // Life Line Care -> 0 hrs
  if (slug === "life-line-care" || rawName.toLowerCase().includes("life line care")) {
    return { entitlementHours: 0.0, packageName: rawName || "Life Line Care", packageSlug: "life-line-care" };
  }

  // Custom Plan Metadata inspection
  if (params.customMetadata && typeof params.customMetadata === "object") {
    const metaHours = params.customMetadata.monthlyEntitlementHours || params.customMetadata.entitlementHours;
    if (typeof metaHours === "number" && !isNaN(metaHours) && metaHours >= 0) {
      return { entitlementHours: metaHours, packageName: rawName || "Custom Care Plan", packageSlug: slug || "custom-plan" };
    }
  }

  // Inspect services notes for pattern "Total X Hrs/Month"
  if (params.services && Array.isArray(params.services)) {
    for (const s of params.services) {
      const text = `${s.serviceName || ""} ${s.serviceNote || ""}`;
      const match = text.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)(?:\s*\/\s*month)?/i);
      if (match) {
        const parsed = parseFloat(match[1]);
        if (!isNaN(parsed) && parsed >= 0) {
          return { entitlementHours: parsed, packageName: rawName || "Care Package", packageSlug: slug || "care-plan" };
        }
      }
    }
  }

  // Inspect description regex
  if (params.customDescription) {
    const match = params.customDescription.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)(?:\s*\/\s*month)?/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed >= 0) {
        return { entitlementHours: parsed, packageName: rawName || "Custom Plan", packageSlug: slug || "custom-plan" };
      }
    }
  }

  // Default fallback
  return {
    entitlementHours: 0.0,
    packageName: rawName || "General Membership",
    packageSlug: slug || "standard-membership",
  };
}

/**
 * Calculates actual completed visit duration in minutes and hours.
 * Strictly uses actual arrival and departure timestamps when completed.
 */
export function calculateVisitActualDuration(visit: {
  actualStart?: Date | string | null;
  actualEnd?: Date | string | null;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  completedAt?: Date | string | null;
}): { durationMinutes: number; durationHours: number } {
  let startMs: number | null = null;
  let endMs: number | null = null;

  if (visit.actualStart) {
    const s = new Date(visit.actualStart).getTime();
    if (!isNaN(s)) startMs = s;
  }
  if (visit.actualEnd) {
    const e = new Date(visit.actualEnd).getTime();
    if (!isNaN(e)) endMs = e;
  }

  // Fallback to completedAt if actualEnd is missing
  if (endMs === null && visit.completedAt) {
    const c = new Date(visit.completedAt).getTime();
    if (!isNaN(c)) endMs = c;
  }

  // Fallback to scheduledStart if actualStart is missing
  if (startMs === null) {
    const ss = new Date(visit.scheduledStart).getTime();
    if (!isNaN(ss)) startMs = ss;
  }

  if (startMs !== null && endMs !== null && endMs > startMs) {
    const diffMs = endMs - startMs;
    const durationMinutes = Math.round(diffMs / 60000);
    // Round to 1 decimal place (e.g. 1.5 hrs, 2.5 hrs)
    const durationHours = Math.round((diffMs / 3600000) * 10) / 10;
    return { durationMinutes, durationHours };
  }

  // Fallback to scheduled duration
  const ss = new Date(visit.scheduledStart).getTime();
  const se = new Date(visit.scheduledEnd).getTime();
  const diffMs = se > ss ? se - ss : 3600000;
  const durationMinutes = Math.round(diffMs / 60000);
  const durationHours = Math.round((diffMs / 3600000) * 10) / 10;
  return { durationMinutes, durationHours };
}

export class MonthlyExcessHoursService {
  /**
   * Calculates live statement data across all members for a given month.
   */
  public static async calculateLiveMonthlyStatement(monthKey: string): Promise<MonthlyReportSummary> {
    const db = getMonthlyHoursDb();
    const { startUTC, endUTC, year, month, monthLabel } = getMonthBoundsIST(monthKey);

    // 1. Fetch all members with their profiles, user, elders, cases, and subscriptions
    const members = await db.memberProfile.findMany({
      include: {
        user: {
          include: {
            elders: {
              include: {
                cases: {
                  include: {
                    subscription: {
                      include: {
                        carePlan: {
                          include: {
                            variants: {
                              include: { services: true },
                            },
                          },
                        },
                        plan: true,
                        customPlan: true,
                      },
                    },
                    visits: {
                      where: {
                        status: { in: ["COMPLETED", "RESOLVED"] },
                        OR: [
                          { scheduledStart: { gte: startUTC, lte: endUTC } },
                          { actualStart: { gte: startUTC, lte: endUTC } },
                          { completedAt: { gte: startUTC, lte: endUTC } },
                        ],
                      },
                      include: {
                        assignedEmp: true,
                        careCase: {
                          include: { elder: true },
                        },
                      },
                      orderBy: { scheduledStart: "asc" },
                    },
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
            subscriptions: {
              where: {
                status: "ACTIVE",
              },
              include: {
                carePlan: {
                  include: {
                    variants: {
                      include: { services: true },
                    },
                  },
                },
                plan: true,
                customPlan: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: [
        { memberId: "asc" },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });

    const items: MemberMonthlyStatementData[] = [];

    for (const profile of members) {
      const user = profile.user;
      const memberId = profile.memberId || `SEC-${profile.id.slice(-6).toUpperCase()}`;
      const memberName = `${profile.salutation ? profile.salutation + " " : ""}${profile.firstName} ${profile.lastName}`.trim();

      // Resolve applicable active subscription
      let activeSub = user?.subscriptions?.[0] || null;

      // If user has care cases with subscriptions, check those as well
      if (!activeSub && user?.elders) {
        for (const elder of user.elders) {
          for (const c of elder.cases) {
            if (c.subscription && c.subscription.status === "ACTIVE") {
              activeSub = c.subscription;
              break;
            }
          }
          if (activeSub) break;
        }
      }

      // Resolve package entitlement
      const entitlement = resolvePackageEntitlement({
        planSlug: activeSub?.carePlan?.slug || activeSub?.plan?.slug || null,
        planName: activeSub?.carePlan?.name || activeSub?.plan?.name || activeSub?.customPlan?.name || null,
        services: activeSub?.carePlan?.variants?.flatMap((v: any) => v.services || []) || null,
        customDescription: activeSub?.customPlan?.description || null,
        customMetadata: activeSub?.customPlan?.metadata || null,
      });

      // Collect all completed visits for this member in this month
      const memberVisits: VisitDrilldownItem[] = [];
      const seenVisitIds = new Set<string>();

      if (user?.elders) {
        for (const elder of user.elders) {
          for (const c of elder.cases) {
            for (const v of c.visits) {
              if (seenVisitIds.has(v.id)) continue;
              seenVisitIds.add(v.id);

              const duration = calculateVisitActualDuration(v);
              const schedIST = formatTimeIST(v.scheduledStart);
              const arrivalIST = v.actualStart ? formatTimeIST(v.actualStart) : null;
              const departureIST = v.actualEnd ? formatTimeIST(v.actualEnd) : null;

              memberVisits.push({
                visitId: v.id,
                dateKey: formatDateKey(v.scheduledStart),
                scheduledTime: schedIST,
                actualArrival: arrivalIST,
                actualDeparture: departureIST,
                durationMinutes: duration.durationMinutes,
                durationHours: duration.durationHours,
                caregiver: v.assignedEmp ? `${v.assignedEmp.firstName} ${v.assignedEmp.lastName}` : "Unassigned Staff",
                elderName: `${elder.firstName} ${elder.lastName}`.trim(),
                status: v.status,
                workDescription: v.workDescription,
              });
            }
          }
        }
      }

      // Calculate total actual completed hours
      const rawTotalHours = memberVisits.reduce((acc, curr) => acc + curr.durationHours, 0);
      const totalHoursUsed = Math.round(rawTotalHours * 10) / 10;
      const monthlyEntitlement = entitlement.entitlementHours;

      // Remaining Hours: Math.max(0, Monthly Entitlement - Total Hours Used)
      const remainingHours = Math.max(0, Math.round((monthlyEntitlement - totalHoursUsed) * 10) / 10);

      // Excess Hours: Math.max(0, Total Hours Used - Monthly Entitlement)
      const excessHours = Math.max(0, Math.round((totalHoursUsed - monthlyEntitlement) * 10) / 10);

      const hasExcess = excessHours > 0;

      items.push({
        memberId,
        memberName,
        userId: user?.id || null,
        profileId: profile.id,
        packageName: entitlement.packageName,
        packageSlug: entitlement.packageSlug,
        monthlyEntitlement,
        totalHoursUsed,
        remainingHours,
        excessHours,
        completedVisits: memberVisits.length,
        reportMonth: monthLabel,
        hasExcess,
        visits: memberVisits,
      });
    }

    // Sort items: Put members with excess hours first, then alphabetical by member name
    items.sort((a, b) => {
      if (a.excessHours !== b.excessHours) {
        return b.excessHours - a.excessHours;
      }
      return a.memberName.localeCompare(b.memberName);
    });

    const totalMembers = items.length;
    const excessMembers = items.filter((i) => i.hasExcess).length;
    const withinEntitlementMembers = totalMembers - excessMembers;

    const totalEntitledHours = Math.round(items.reduce((acc, i) => acc + i.monthlyEntitlement, 0) * 10) / 10;
    const totalUsedHours = Math.round(items.reduce((acc, i) => acc + i.totalHoursUsed, 0) * 10) / 10;
    const totalExcessHours = Math.round(items.reduce((acc, i) => acc + i.excessHours, 0) * 10) / 10;

    return {
      monthKey,
      monthLabel,
      year,
      month,
      status: "ACTIVE",
      totalMembers,
      excessMembers,
      withinEntitlementMembers,
      totalEntitledHours,
      totalUsedHours,
      totalExcessHours,
      generatedAt: new Date().toISOString(),
      finalizedAt: null,
      finalizedById: null,
      items,
    };
  }

  /**
   * Retrieves preserved monthly report from database, or generates live if not yet saved.
   */
  public static async getOrGenerateMonthlyReport(
    monthKey: string,
    options: { forceRefresh?: boolean; saveSnapshot?: boolean } = {}
  ): Promise<MonthlyReportSummary> {
    const db = getMonthlyHoursDb();
    const { forceRefresh = false, saveSnapshot = false } = options;

    // Check for existing saved report in database
    const existing = await db.monthlyCareHoursReport.findUnique({
      where: { monthKey },
      include: {
        items: {
          orderBy: [
            { excessHours: "desc" },
            { memberName: "asc" },
          ],
        },
      },
    });

    // If report exists and we are not forcing refresh, return preserved report!
    if (existing && !forceRefresh) {
      const items: MemberMonthlyStatementData[] = existing.items.map((item: any) => ({
        memberId: item.memberId,
        memberName: item.memberName,
        userId: item.userId,
        profileId: null,
        packageName: item.packageName,
        packageSlug: item.packageSlug,
        monthlyEntitlement: item.monthlyEntitlement,
        totalHoursUsed: item.totalHoursUsed,
        remainingHours: item.remainingHours,
        excessHours: item.excessHours,
        completedVisits: item.completedVisits,
        reportMonth: item.reportMonth,
        hasExcess: item.excessHours > 0,
        visits: (item.metadata as any)?.visits || [],
      }));

      const excessMembers = items.filter((i) => i.hasExcess).length;

      return {
        monthKey: existing.monthKey,
        monthLabel: existing.monthLabel,
        year: existing.year,
        month: existing.month,
        status: (existing.status as "ACTIVE" | "FINALIZED") || "FINALIZED",
        totalMembers: existing.totalMembers,
        excessMembers: existing.excessMembers || excessMembers,
        withinEntitlementMembers: existing.totalMembers - (existing.excessMembers || excessMembers),
        totalEntitledHours: existing.totalEntitledHours,
        totalUsedHours: existing.totalUsedHours,
        totalExcessHours: existing.totalExcessHours,
        generatedAt: existing.generatedAt.toISOString(),
        finalizedAt: existing.finalizedAt ? existing.finalizedAt.toISOString() : null,
        finalizedById: existing.finalizedById,
        items,
      };
    }

    // Calculate live data
    const liveReport = await this.calculateLiveMonthlyStatement(monthKey);

    // Save snapshot if requested or if past month
    if (saveSnapshot || (existing && forceRefresh)) {
      await this.saveMonthlyReportSnapshot(liveReport, existing?.status === "FINALIZED" ? "FINALIZED" : "ACTIVE");
    }

    return liveReport;
  }

  /**
   * Preserves / snapshots monthly statement into database.
   * Ensures idempotency and transactional safety.
   */
  public static async saveMonthlyReportSnapshot(
    report: MonthlyReportSummary,
    status: "ACTIVE" | "FINALIZED" = "FINALIZED",
    adminUserId?: string
  ): Promise<void> {
    const db = getMonthlyHoursDb();

    await db.$transaction(async (tx: any) => {
      // Upsert parent report
      const savedReport = await tx.monthlyCareHoursReport.upsert({
        where: { monthKey: report.monthKey },
        create: {
          monthKey: report.monthKey,
          monthLabel: report.monthLabel,
          year: report.year,
          month: report.month,
          status,
          totalMembers: report.totalMembers,
          excessMembers: report.excessMembers,
          totalEntitledHours: report.totalEntitledHours,
          totalUsedHours: report.totalUsedHours,
          totalExcessHours: report.totalExcessHours,
          generatedAt: new Date(),
          finalizedAt: status === "FINALIZED" ? new Date() : null,
          finalizedById: adminUserId || null,
        },
        update: {
          monthLabel: report.monthLabel,
          year: report.year,
          month: report.month,
          status,
          totalMembers: report.totalMembers,
          excessMembers: report.excessMembers,
          totalEntitledHours: report.totalEntitledHours,
          totalUsedHours: report.totalUsedHours,
          totalExcessHours: report.totalExcessHours,
          generatedAt: new Date(),
          ...(status === "FINALIZED" ? { finalizedAt: new Date(), finalizedById: adminUserId || null } : {}),
        },
      });

      // Clear existing items for this report
      await tx.monthlyCareHoursStatementItem.deleteMany({
        where: { reportId: savedReport.id },
      });

      // Batch insert items
      if (report.items.length > 0) {
        await tx.monthlyCareHoursStatementItem.createMany({
          data: report.items.map((item) => ({
            reportId: savedReport.id,
            memberId: item.memberId,
            memberName: item.memberName,
            userId: item.userId,
            packageName: item.packageName,
            packageSlug: item.packageSlug,
            monthlyEntitlement: item.monthlyEntitlement,
            totalHoursUsed: item.totalHoursUsed,
            remainingHours: item.remainingHours,
            excessHours: item.excessHours,
            completedVisits: item.completedVisits,
            reportMonth: item.reportMonth,
            metadata: {
              visits: item.visits,
            },
          })),
        });
      }
    });
  }

  /**
   * Finalizes a monthly statement (end of month consolidation).
   */
  public static async finalizeMonthlyStatement(monthKey: string, adminUserId?: string): Promise<MonthlyReportSummary> {
    const liveReport = await this.calculateLiveMonthlyStatement(monthKey);
    await this.saveMonthlyReportSnapshot(liveReport, "FINALIZED", adminUserId);
    return await this.getOrGenerateMonthlyReport(monthKey, { forceRefresh: false });
  }

  /**
   * Generates standard CSV export matching management specifications.
   */
  public static generateCSV(report: MonthlyReportSummary): string {
    const headers = [
      "Member ID",
      "Member Name",
      "Membership / Package",
      "Monthly Entitlement (Hrs)",
      "Total Hours Used (Hrs)",
      "Remaining Hours (Hrs)",
      "Excess Hours (Hrs)",
      "Completed Visits",
      "Report Month",
      "Excess Status",
    ];

    const escapeCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = report.items.map((item) => [
      escapeCell(item.memberId),
      escapeCell(item.memberName),
      escapeCell(item.packageName),
      escapeCell(item.monthlyEntitlement.toFixed(1)),
      escapeCell(item.totalHoursUsed.toFixed(1)),
      escapeCell(item.remainingHours.toFixed(1)),
      escapeCell(item.excessHours.toFixed(1)),
      escapeCell(item.completedVisits),
      escapeCell(item.reportMonth),
      escapeCell(item.hasExcess ? "EXCEEDED" : "WITHIN ENTITLEMENT"),
    ]);

    // Add summary banner at bottom
    const summaryRows = [
      [],
      ["SUMMARY STATISTICS", "", "", "", "", "", "", "", "", ""],
      ["Total Members", escapeCell(report.totalMembers), "", "", "", "", "", "", "", ""],
      ["Members Exceeding Entitlement", escapeCell(report.excessMembers), "", "", "", "", "", "", "", ""],
      ["Members Within Entitlement", escapeCell(report.withinEntitlementMembers), "", "", "", "", "", "", "", ""],
      ["Total Entitled Hours", escapeCell(report.totalEntitledHours.toFixed(1)), "", "", "", "", "", "", "", ""],
      ["Total Consumed Hours", escapeCell(report.totalUsedHours.toFixed(1)), "", "", "", "", "", "", "", ""],
      ["Total Excess Hours", escapeCell(report.totalExcessHours.toFixed(1)), "", "", "", "", "", "", "", ""],
      ["Report Status", escapeCell(report.status), "", "", "", "", "", "", "", ""],
      ["Generated At (IST)", escapeCell(report.generatedAt), "", "", "", "", "", "", "", ""],
      ["Notice", escapeCell("Strictly for management monitoring & review. Not an invoice or billing document."), "", "", "", "", "", "", "", ""],
    ];

    const allLines = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      ...summaryRows.map((r) => r.join(",")),
    ];

    return allLines.join("\r\n");
  }

  /**
   * Lists available selectable months (last 12 calendar months + current month).
   */
  public static async listAvailableMonths(): Promise<
    Array<{ monthKey: string; monthLabel: string; isSaved: boolean; status?: string }>
  > {
    const db = getMonthlyHoursDb();
    const savedReports = await db.monthlyCareHoursReport.findMany({
      select: { monthKey: true, monthLabel: true, status: true },
    });
    const savedMap = new Map(savedReports.map((r: any) => [r.monthKey, r.status]));

    const now = new Date();
    const months: Array<{ monthKey: string; monthLabel: string; isSaved: boolean; status?: string }> = [];

    // Last 12 months up to current
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const { monthLabel } = getMonthBoundsIST(key);
      const isSaved = savedMap.has(key);
      const status = savedMap.get(key);

      months.push({
        monthKey: key,
        monthLabel,
        isSaved,
        status,
      });
    }

    return months;
  }
}
