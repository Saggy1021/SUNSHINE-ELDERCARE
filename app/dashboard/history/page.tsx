import { getMembershipHistory } from "@/app/actions/membership"
import { auth } from "@/auth"
import { Shield, CalendarDays } from "lucide-react"

export default async function MembershipHistoryPage() {
  const history = await getMembershipHistory()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Membership History</h1>
        <p className="text-slate-600 mt-1">Review all your past and current memberships.</p>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            No membership history found.
          </div>
        ) : (
          history.map((sub) => {
            const planName = sub.customPlan ? sub.customPlan.name : (sub.carePlan?.name || "Unknown Plan")
            const isCustom = !!sub.customPlan

            return (
              <div key={sub.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-900">{planName}</h3>
                    {isCustom && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                        Custom Plan
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {sub.durationMonths} Months • {sub.variantType || 'Custom Variant'}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 md:items-end">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide w-fit
                    ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 
                      sub.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' :
                      sub.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600' :
                      sub.status === 'EXPIRED' ? 'bg-red-500/10 text-red-600' :
                      'bg-slate-500/10 text-slate-600'}`}
                  >
                    {sub.status}
                  </span>
                  
                  {(sub.startDate || sub.endDate) && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {sub.startDate ? sub.startDate.toLocaleDateString() : '?'} → {sub.endDate ? sub.endDate.toLocaleDateString() : '?'}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
