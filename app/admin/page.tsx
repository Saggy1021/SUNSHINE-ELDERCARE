import { getAdminDashboardMetrics, getNeedsAttentionQueue } from "@/app/actions/admin"
import Link from "next/link"
import { Users, Activity, AlertCircle, RefreshCw, ClipboardList, MessageSquare } from "lucide-react"

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics()
  const queue = await getNeedsAttentionQueue()

  const statCards = [
    { name: "Total Members", value: metrics.totalMembers, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Active Memberships", value: metrics.activeMembers, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Pending Renewals", value: metrics.pendingRenewals, icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-100" },
    { name: "New Inquiries", value: metrics.newInquiries, icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-100" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of operational metrics and items requiring attention.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Needs Attention Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900">Needs Attention</h2>
          </div>
          
          <div className="p-6 flex-1 space-y-6">
            
            {/* Pending Renewals */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Pending Renewals ({queue.pendingRenewals.length})</h3>
              {queue.pendingRenewals.length === 0 ? (
                <p className="text-sm text-slate-500">No pending requests.</p>
              ) : (
                <ul className="space-y-3">
                  {queue.pendingRenewals.map(req => (
                    <li key={req.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{req.user.name || req.user.email}</p>
                        <p className="text-xs text-slate-500">{req.planName} - {req.durationMonths}m</p>
                      </div>
                      <Link href={`/admin/renewals`} className="text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-100 px-3 py-1.5 rounded-md">
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Unresolved Feedback */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Unresolved Feedback ({queue.unresolvedFeedback.length})</h3>
              {queue.unresolvedFeedback.length === 0 ? (
                <p className="text-sm text-slate-500">No unresolved feedback.</p>
              ) : (
                <ul className="space-y-3">
                  {queue.unresolvedFeedback.map(fb => (
                    <li key={fb.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{fb.user.name || fb.user.email}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{fb.message}</p>
                      </div>
                      <Link href={`/admin/feedback`} className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md">
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

        {/* Secondary Metrics / Secondary Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Membership Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-600 font-medium">Scheduled (Future)</span>
              <span className="font-bold text-slate-900">{metrics.scheduledMemberships}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-600 font-medium">Expiring Soon</span>
              <span className="font-bold text-slate-900">{metrics.expiringMemberships}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-600 font-medium">Expired</span>
              <span className="font-bold text-slate-900">{metrics.expiredMemberships}</span>
            </div>
          </div>
          
          <div className="mt-8">
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> New Inquiries ({queue.newInquiries.length})
             </h3>
             {queue.newInquiries.length === 0 ? (
                <p className="text-sm text-slate-500">No new inquiries.</p>
              ) : (
                <ul className="space-y-3">
                  {queue.newInquiries.map(inq => (
                    <li key={inq.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{inq.fullName}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{inq.message}</p>
                      </div>
                      <Link href={`/admin/inquiries`} className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-100 px-3 py-1.5 rounded-md">
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
