import { Suspense } from "react"
import { getAdminDashboardMetrics } from "@/app/actions/admin"
import Link from "next/link"
import { Users, Activity, RefreshCw, ClipboardList } from "lucide-react"
import {
  NeedsAttentionWidget,
  NeedsAttentionSkeleton,
  InquiriesWidget,
  InquiriesSkeleton,
} from "@/components/admin/dashboard-widgets"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();

  const statCards = [
    { name: "Total Members", value: metrics.totalMembers, icon: Users, iconColor: "text-[#091329]", iconBg: "bg-slate-100" },
    { name: "Active Memberships", value: metrics.activeMembers, icon: Activity, iconColor: "text-emerald-700", iconBg: "bg-emerald-50" },
    { name: "Pending Renewals", value: metrics.pendingRenewals, icon: RefreshCw, iconColor: "text-amber-700", iconBg: "bg-amber-50" },
    { name: "Pending Payments", value: metrics.pendingPayments, icon: ClipboardList, iconColor: "text-[#B08A4A]", iconBg: "bg-[#B08A4A]/10" },
  ];

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
        {/* Needs Attention Queue - Streamed via Suspense */}
        <Suspense fallback={<NeedsAttentionSkeleton />}>
          <NeedsAttentionWidget />
        </Suspense>

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
          
          {/* New Inquiries - Streamed via Suspense */}
          <Suspense fallback={<InquiriesSkeleton />}>
            <InquiriesWidget />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
