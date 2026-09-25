import { getAuditLogs } from "@/app/actions/admin"
import { Shield } from "lucide-react"

export default async function AdminAuditLogPage() {
  const logs = await getAuditLogs()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-700" /> Audit Log
          </h1>
          <p className="text-slate-600 mt-1">Immutable record of administrative operations.</p>
        </div>
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
    </div>
  )
}
