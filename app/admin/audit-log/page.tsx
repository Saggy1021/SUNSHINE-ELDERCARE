
import { getAuditLogs } from "@/app/actions/admin"
import { Shield, ChevronLeft, ChevronRight, Search } from "lucide-react"
import Link from "next/link"

export default async function AdminAuditLogPage({ searchParams }: { searchParams: { page?: string, action?: string, entityType?: string } }) {
  const page = parseInt(searchParams.page || "1", 10)
  const action = searchParams.action || undefined
  const entityType = searchParams.entityType || undefined
  const pageSize = 50

  const { logs, total, pages } = await getAuditLogs({ page, pageSize, action, entityType })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-700" /> Audit Log
          </h1>
          <p>Immutable record of administrative operations.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Action</label>
            <input name="action" defaultValue={action} placeholder="e.g. ADMIN_USER_CREATED" className="border-slate-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Entity Type</label>
            <input name="entityType" defaultValue={entityType} placeholder="e.g. USER" className="border-slate-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-md sm:text-sm flex items-center gap-2">
            <Search className="w-4 h-4" /> Filter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {log.createdAt.toLocaleString('en-GB')}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{log.actor.name || "Admin"}</p>
                    <p className="text-xs text-slate-500">{log.actor.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-800 font-mono text-xs px-2 py-1 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700 font-medium">{log.entityType}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{log.entityId.slice(-8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <pre className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded max-w-xs overflow-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">Showing page {page} of {pages} ({total} total)</p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`?page=${page - 1}${action ? '&action='+action : ''}${entityType ? '&entityType='+entityType : ''}`} className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Link>
            ) : (
              <button disabled className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-slate-400 flex items-center cursor-not-allowed">
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </button>
            )}
            {page < pages ? (
              <Link href={`?page=${page + 1}${action ? '&action='+action : ''}${entityType ? '&entityType='+entityType : ''}`} className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 flex items-center">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            ) : (
              <button disabled className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-slate-400 flex items-center cursor-not-allowed">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}