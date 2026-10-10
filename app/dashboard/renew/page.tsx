import { getCarePlanCatalog } from "@/app/actions/care-plans"
import { getActiveAddOns } from "@/app/actions/membership"
import RenewalWorkflow from "@/components/yoga/member/renewal-workflow"

export default async function RenewMembershipPage() {
  const plansResult = await getCarePlanCatalog()
  const plans = plansResult.success && plansResult.data ? plansResult.data : []
  const addOns = await getActiveAddOns()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Renew Membership</h1>
        <p className="text-slate-600 mt-1">Select your preferred package, duration, and start date.</p>
      </div>

      <RenewalWorkflow plans={plans} addOns={addOns} />
    </div>
  )
}
