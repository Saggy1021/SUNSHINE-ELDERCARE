import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getScheduleVisits, getCareScheduleFormData, getBirthdayCalendarEntries } from "@/app/actions/care-schedule";
import { VisitScheduleCalendar } from "@/components/admin/schedule/VisitScheduleCalendar";
import { getWeekDays } from "@/components/admin/schedule/schedule-date-utils";
import { ShieldAlert, CalendarDays } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Visit Schedule — Sunshine Eldercare Admin" };
export const dynamic = "force-dynamic";

export default async function AdminVisitSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/schedule");

  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  const [canView, canManage] = isOwner
    ? [true, true]
    : await Promise.all([
        AuthorizationService.can(session.user.id, PERMISSIONS.CARE_VISIT_VIEW, session.user.email).then(
          async (res) => res || (await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW, session.user.email))
        ),
        AuthorizationService.can(session.user.id, PERMISSIONS.CARE_VISIT_MANAGE, session.user.email).then(
          async (res) => res || (await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_MANAGE, session.user.email))
        ),
      ]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#091329]" /> Visit Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">Multi-day care visit scheduling and caregiver assignment calendar.</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You do not have the required permission to access the Visit Schedule calendar. Please contact an administrator or account owner.
          </p>
          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pre-load initial week around current date
  const now = new Date();
  const weekDays = getWeekDays(now);
  const startDate = new Date(weekDays[0]);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(weekDays[6]);
  endDate.setHours(23, 59, 59, 999);

  const [initialVisits, initialFormData, initialBirthdays] = await Promise.all([
    getScheduleVisits({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    getCareScheduleFormData(),
    getBirthdayCalendarEntries(),
  ]);

  return (
    <VisitScheduleCalendar
      initialVisits={initialVisits}
      initialFormData={initialFormData}
      initialBirthdays={initialBirthdays}
      canManage={canManage}
    />
  );
}
