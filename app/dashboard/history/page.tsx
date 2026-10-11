import { getMembershipHistory } from "@/app/actions/membership"
import { auth } from "@/auth"
import { Shield, CalendarDays } from "lucide-react"

export default async function MembershipHistoryPage() {
  const history = await getMembershipHistory()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">History</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Membership History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review all your past and current memberships and subscriptions.</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {history.length === 0 ? (
          <div className="bg-card p-10 rounded-xl border border-border/60 text-center text-muted-foreground text-sm">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#B08A4A]" />
            No membership history found.
          </div>
        ) : (
          history.map((sub) => {
            const planName = sub.customPlan ? sub.customPlan.name : (sub.carePlan?.name || "Care Plan")
            const isCustom = !!sub.customPlan

            return (
              <div key={sub.id} className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:border-[#091329]/30 dark:hover:border-amber-400/30">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-[#B08A4A]" />
                    <h3 className="font-semibold text-foreground text-base">{planName}</h3>
                    {isCustom && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-[#B08A4A] border border-amber-500/20 uppercase tracking-wider">
                        Custom Plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sub.durationMonths} Months • {sub.variantType || 'Custom Variant'}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 md:items-end">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide w-fit border
                    ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20' :
                      sub.status === 'PENDING' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' :
                      sub.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20' :
                      sub.status === 'EXPIRED' ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20' :
                      'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'}`}
                  >
                    {sub.status}
                  </span>
                  
                  {(sub.startDate || sub.endDate) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {sub.startDate ? sub.startDate.toLocaleDateString('en-GB') : '?'} → {sub.endDate ? sub.endDate.toLocaleDateString('en-GB') : '?'}
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
