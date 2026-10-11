import { getAdminDashboardMetrics, getNeedsAttentionQueue } from "@/app/actions/admin"
import Link from "next/link"
import { Users, Activity, AlertCircle, RefreshCw, ClipboardList, MessageSquare, ArrowRight, Clock, ShieldCheck } from "lucide-react"

export default async function AdminDashboardPage() {
  const [metrics, queue] = await Promise.all([
    getAdminDashboardMetrics(),
    getNeedsAttentionQueue()
  ]);

  const statCards = [
    { name: "Total Members", value: metrics.totalMembers, icon: Users, iconColor: "text-[#091329]", iconBg: "bg-slate-100" },
    { name: "Active Memberships", value: metrics.activeMembers, icon: Activity, iconColor: "text-emerald-700", iconBg: "bg-emerald-50" },
    { name: "Pending Renewals", value: metrics.pendingRenewals, icon: RefreshCw, iconColor: "text-amber-700", iconBg: "bg-amber-50" },
    { name: "Pending Payments", value: metrics.pendingPayments, icon: ClipboardList, iconColor: "text-[#B08A4A]", iconBg: "bg-[#B08A4A]/10" },
  ]

  const totalActionItems =
    queue.pendingRenewals.length +
    queue.pendingPayments.length +
    queue.unresolvedFeedback.length +
    queue.newInquiries.length

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Operational metrics and high-priority administrative tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/members/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors"
          >
            + Onboard Member
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.name}</p>
              <p className="text-2xl font-bold tracking-tight text-[#091329]">{stat.value}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Needs Attention Queue */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Needs Attention</h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
              {totalActionItems} items
            </span>
          </div>
          
          <div className="p-6 flex-1 space-y-6">
            
            {/* Pending Renewals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Renewals ({queue.pendingRenewals.length})</h3>
                <Link href="/admin/renewals" className="text-xs text-[#B08A4A] hover:underline font-medium">View all</Link>
              </div>
              {queue.pendingRenewals.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                  No pending renewal requests.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {queue.pendingRenewals.map(req => (
                    <li key={req.id} className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{req.user.name || req.user.email}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{req.planName} · {req.durationMonths}m</p>
                      </div>
                      <Link href="/admin/renewals" className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2.5 py-1.5 rounded-md transition-colors">
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pending Payments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Payments ({queue.pendingPayments.length})</h3>
                <Link href="/admin/payments" className="text-xs text-[#B08A4A] hover:underline font-medium">View all</Link>
              </div>
              {queue.pendingPayments.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                  No pending payments.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {queue.pendingPayments.map(payment => (
                    <li key={payment.id} className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{payment.user.name || payment.user.email}</p>
                        <p className="text-xs text-slate-500 mt-0.5">₹{payment.amount.toString()} · {payment.paymentMethod}</p>
                      </div>
                      <Link href="/admin/payments" className="inline-flex items-center gap-1 text-xs font-medium text-[#091329] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors">
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Unresolved Feedback */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unresolved Feedback ({queue.unresolvedFeedback.length})</h3>
                <Link href="/admin/feedback" className="text-xs text-[#B08A4A] hover:underline font-medium">View all</Link>
              </div>
              {queue.unresolvedFeedback.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                  No unresolved feedback.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {queue.unresolvedFeedback.map(fb => (
                    <li key={fb.id} className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-slate-900 text-sm truncate">{fb.user.name || fb.user.email}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{fb.message}</p>
                      </div>
                      <Link href="/admin/feedback" className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors shrink-0">
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

        {/* Secondary Metrics / Status Overview */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Membership Lifecycle Status</h2>
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-600">Scheduled (Future Activation)</span>
                <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">{metrics.scheduledMemberships}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-600">Expiring Soon</span>
                <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">{metrics.expiringMemberships}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-600">Expired</span>
                <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{metrics.expiredMemberships}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#091329]" /> New Inquiries ({queue.newInquiries.length})
              </h3>
              <Link href="/admin/inquiries" className="text-xs text-[#B08A4A] hover:underline font-medium">View all</Link>
            </div>
            {queue.newInquiries.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                No new inquiries.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {queue.newInquiries.map(inq => (
                  <li key={inq.id} className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-slate-900 text-sm truncate">{inq.fullName}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{inq.message}</p>
                    </div>
                    <Link href="/admin/inquiries" className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors shrink-0">
                      View <ArrowRight className="h-3 w-3" />
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
