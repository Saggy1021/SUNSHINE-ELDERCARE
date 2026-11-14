import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { CareOperationsClient } from "./CareOperationsClient";
import { Calendar, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Care Operations — Admin" };

export default async function CareOperationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/care");

  const canView = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW);
  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[#091329]" /> Care Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">Schedule and manage care visits with operational employee assignments.</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You do not have the required permission (<code className="font-mono text-xs bg-rose-100/80 px-1.5 py-0.5 rounded text-rose-700">CARE_CASE_VIEW</code>) to access Care Operations. Please contact an administrator or account owner to request access.
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

  const canManage = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_MANAGE);

  // Security: project only needed elder fields, excluding user password hashes and credentials
  const cases = await db.careCase.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      elder: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      designation: true,
    },
    orderBy: { firstName: "asc" },
  });

  // Security & Stability: select only required fields and relations
  const operations = await db.careVisit.findMany({
    orderBy: { scheduledStart: "desc" },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      operationalNotes: true,
      careCase: {
        select: {
          id: true,
          elder: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      assignments: {
        select: {
          id: true,
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    take: 100,
  });

  // Pre-serialize dates to ISO strings to guarantee deterministic server and client hydration
  const serializedOperations = operations.map((op) => ({
    ...op,
    scheduledStart: op.scheduledStart.toISOString(),
    scheduledEnd: op.scheduledEnd.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
          <Calendar className="h-6 w-6 text-[#091329]" /> Care Operations
        </h1>
        <p className="text-sm text-slate-500 mt-1">Schedule and manage care visits with operational employee assignments.</p>
      </div>

      <CareOperationsClient 
        operations={serializedOperations} 
        cases={cases} 
        employees={employees} 
        canManage={canManage} 
      />
    </div>
  );
}
