import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { CareOperationsClient } from "./CareOperationsClient";
import { Calendar } from "lucide-react";

export const metadata = { title: "Care Operations — Admin" };

export default async function CareOperationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/care/operations");

  const canView = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW);
  if (!canView) redirect("/admin");
  const canManage = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_MANAGE);

  const cases = await db.careCase.findMany({
    where: { status: "ACTIVE" },
    include: { elder: { include: { user: true } } },
    orderBy: { createdAt: "desc" }
  });

  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: { firstName: "asc" }
  });

  const operations = await db.careVisit.findMany({
    orderBy: { scheduledStart: "desc" },
    include: {
      careCase: { include: { elder: { include: { user: true } } } },
      assignments: { include: { employee: true } }
    },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Care Operations</h1>
      </div>
      <p className="text-slate-500 text-sm">Schedule and manage care visits with multiple employee assignments.</p>

      <CareOperationsClient 
        operations={operations} 
        cases={cases} 
        employees={employees} 
        canManage={canManage} 
      />
    </div>
  );
}
