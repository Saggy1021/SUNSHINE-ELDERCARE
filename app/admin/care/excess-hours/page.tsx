import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MonthlyExcessHoursService } from "@/lib/services/monthly-excess-hours";
import { MonthlyExcessHoursClient } from "@/components/admin/reports/MonthlyExcessHoursClient";
import { getKolkataDateParts } from "@/components/admin/schedule/schedule-date-utils";

export const metadata = {
  title: "Monthly Excess Care Hours Statement — Sunshine Eldercare",
  description: "Consolidated monthly care hours entitlement and completed visit duration audit statement.",
};

export default async function MonthlyExcessCareHoursPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/care/excess-hours");
  }

  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  const isAdmin = isOwner || session.user.role === "ADMIN";

  const canViewCase = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW, session.user.email);
  const canViewVisit = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_VISIT_VIEW, session.user.email);

  if (!isAdmin && !canViewCase && !canViewVisit) {
    redirect("/admin");
  }

  // Determine current monthKey in Asia/Kolkata
  const now = new Date();
  const parts = getKolkataDateParts(now);
  const initialMonthKey = `${parts.year}-${String(parts.month).padStart(2, "0")}`;

  // Fetch initial report and available months
  const [initialReport, availableMonths] = await Promise.all([
    MonthlyExcessHoursService.getOrGenerateMonthlyReport(initialMonthKey, { forceRefresh: false }),
    MonthlyExcessHoursService.listAvailableMonths(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <MonthlyExcessHoursClient
        initialMonthKey={initialMonthKey}
        initialReport={initialReport}
        availableMonths={availableMonths}
        userRole={session.user.role}
      />
    </div>
  );
}
