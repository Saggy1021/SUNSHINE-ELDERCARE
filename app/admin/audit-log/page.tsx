import { getAuditLogs } from "@/app/actions/admin"
import { Shield, ChevronLeft, ChevronRight, Activity } from "lucide-react"
import Link from "next/link"
import { AuditLogSearch } from "./AuditLogSearch"
import { auth } from "@/auth"
import { AuthorizationService } from "@/lib/services/authorization"
import { redirect } from "next/navigation"

export const metadata = { title: "Audit Log — Sunshine Eldercare Admin" };

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entityType?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/audit-log");

  const canView = await AuthorizationService.can(session.user.id, "AUDIT_VIEW");
  if (!canView) redirect("/admin");

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const action = params.action || undefined;
  const entityType = params.entityType || undefined;
  const pageSize = 50;

  const { logs, total, pages } = await getAuditLogs({ page, pageSize, action, entityType });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          aria-label="Back to Admin Dashboard"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-700" /> Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Immutable record of administrative operations.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <AuditLogSearch initialAction={action} initialEntityType={entityType} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No audit logs match your search.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{log.actor?.name || "System"}</div>
                      <div className="text-xs text-slate-500">{log.actor?.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-slate-700">{log.entityType}</div>
                      <div className="text-xs font-mono text-slate-400 truncate max-w-[150px]">
                        {log.entityId}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs font-mono text-slate-600 break-all max-w-xs">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500">
              Showing page {page} of {pages} (Total: {total} records)
            </span>
            <div className="flex gap-2">
              <Link
                href={`/admin/audit-log?page=${Math.max(1, page - 1)}${action ? `&action=${action}` : ""}${entityType ? `&entityType=${entityType}` : ""}`}
                className={`px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium ${
                  page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-slate-100"
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/admin/audit-log?page=${Math.min(pages, page + 1)}${action ? `&action=${action}` : ""}${entityType ? `&entityType=${entityType}` : ""}`}
                className={`px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium ${
                  page >= pages ? "opacity-50 pointer-events-none" : "hover:bg-slate-100"
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
