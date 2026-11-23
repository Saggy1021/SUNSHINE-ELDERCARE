"use server";

import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  MonthlyExcessHoursService,
  MonthlyReportSummary,
} from "@/lib/services/monthly-excess-hours";

async function verifyCareReportAccess(): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { authorized: false, error: "Unauthorized. Please log in." };
  }

  // Owner or Admin role bypass
  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  if (isOwner || session.user.role === "ADMIN") {
    return { authorized: true, userId: session.user.id };
  }

  // Permission check: CARE_CASE_VIEW or CARE_VISIT_VIEW
  const canViewCase = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW, session.user.email);
  const canViewVisit = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_VISIT_VIEW, session.user.email);

  if (!canViewCase && !canViewVisit) {
    return {
      authorized: false,
      error: "Access denied. You require care operations viewing permissions.",
    };
  }

  return { authorized: true, userId: session.user.id };
}

/**
 * Fetches the consolidated monthly statement for the requested month.
 * If preserved in database, returns preserved snapshot. If not or if forceRefresh is true,
 * calculates live data from completed care visits.
 */
export async function getMonthlyCareHoursStatementAction(
  monthKey: string,
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  report?: MonthlyReportSummary;
  error?: string;
}> {
  try {
    const authCheck = await verifyCareReportAccess();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const report = await MonthlyExcessHoursService.getOrGenerateMonthlyReport(monthKey, {
      forceRefresh,
    });

    return { success: true, report };
  } catch (error: any) {
    console.error("[GET_MONTHLY_CARE_HOURS_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Failed to load monthly care hours statement.",
    };
  }
}

/**
 * Finalizes and permanently snapshots the monthly statement for management audit.
 */
export async function finalizeMonthlyCareHoursStatementAction(
  monthKey: string
): Promise<{
  success: boolean;
  report?: MonthlyReportSummary;
  error?: string;
}> {
  try {
    const authCheck = await verifyCareReportAccess();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const report = await MonthlyExcessHoursService.finalizeMonthlyStatement(
      monthKey,
      authCheck.userId
    );

    return { success: true, report };
  } catch (error: any) {
    console.error("[FINALIZE_MONTHLY_CARE_HOURS_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Failed to finalize monthly statement.",
    };
  }
}

/**
 * Exports CSV content string for direct client-side download.
 */
export async function exportMonthlyStatementCSVAction(
  monthKey: string
): Promise<{
  success: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const authCheck = await verifyCareReportAccess();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const report = await MonthlyExcessHoursService.getOrGenerateMonthlyReport(monthKey);
    const csv = MonthlyExcessHoursService.generateCSV(report);
    const filename = `Sunshine-Excess-Care-Hours-Statement-${monthKey}.csv`;

    return { success: true, csv, filename };
  } catch (error: any) {
    console.error("[EXPORT_MONTHLY_CARE_HOURS_CSV_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Failed to generate CSV export.",
    };
  }
}

/**
 * Lists selectable months for the admin filter dropdown.
 */
export async function listAvailableStatementMonthsAction(): Promise<{
  success: boolean;
  months?: Array<{ monthKey: string; monthLabel: string; isSaved: boolean; status?: string }>;
  error?: string;
}> {
  try {
    const authCheck = await verifyCareReportAccess();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const months = await MonthlyExcessHoursService.listAvailableMonths();
    return { success: true, months };
  } catch (error: any) {
    console.error("[LIST_STATEMENT_MONTHS_ERROR]", error);
    return {
      success: false,
      error: error?.message || "Failed to list available months.",
    };
  }
}
