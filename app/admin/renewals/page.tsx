import { getRenewalRequests } from "@/app/actions/admin"
import RenewalActions from "@/components/yoga/admin/renewal-actions"
import { RefreshCw, CalendarDays } from "lucide-react"

export default async function AdminRenewalsPage() {
  const requests = await getRenewalRequests()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-amber-600" /> Renewal Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve membership renewal applications.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Requested Plan</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Start Date</th>
                <th className="px-5 py-3.5">Submitted</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Action / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No renewal requests found.
                  </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{req.user.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{req.user.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{req.planName}</p>
                    <p className="text-xs text-slate-500 uppercase mt-0.5">{req.variantType}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{req.durationMonths} Months</td>
                  <td className="px-5 py-3.5 font-semibold text-[#091329]">₹{req.documentedTotal.toString()}</td>
                  <td className="px-5 py-3.5 text-slate-700">
                    <div className="flex items-center gap-1.5 text-xs">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {req.requestedStartDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {req.createdAt.toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      req.requestType === 'UPGRADE' ? 'bg-purple-50 text-purple-700 border border-purple-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                    }`}>
                      {req.requestType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 flex justify-end">
                    <RenewalActions requestId={req.id} status={req.status} requestType={req.requestType} />
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
