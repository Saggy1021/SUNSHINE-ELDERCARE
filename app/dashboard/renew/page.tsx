import { getCarePlanCatalog } from "@/app/actions/care-plans"
import { getActiveAddOns } from "@/app/actions/membership"
import RenewalWorkflow from "@/components/yoga/member/renewal-workflow"

export default async function RenewMembershipPage() {
  const plansResult = await getCarePlanCatalog()
  const plans = plansResult.success && plansResult.data ? plansResult.data : []
  const addOns = await getActiveAddOns()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Renew Membership</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Renew Membership</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Select your preferred package, duration, and start date.</p>
        </div>
      </div>

      <RenewalWorkflow plans={plans} addOns={addOns} />
    </div>
  )
}
