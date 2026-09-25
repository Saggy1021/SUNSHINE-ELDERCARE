import { getRenewalRequests } from "@/app/actions/admin"
import RenewalActions from "@/components/yoga/admin/renewal-actions"
import { RefreshCw, CalendarDays } from "lucide-react"

export default async function AdminRenewalsPage() {
  const requests = await getRenewalRequests()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-amber-500" /> Renewal Requests
          </h1>
          <p className="text-slate-600 mt-1">Manage membership renewal applications.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Requested Plan</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4 text-right">Action / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No renewal requests found.
                  </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{req.user.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{req.user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{req.planName}</p>
                    <p className="text-xs text-slate-500 uppercase">{req.variantType}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{req.durationMonths} Months</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₹{req.documentedTotal.toString()}</td>
                  <td className="px-6 py-4 text-slate-700">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {req.requestedStartDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {req.createdAt.toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 flex justify-end">
                    <RenewalActions requestId={req.id} status={req.status} />
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
