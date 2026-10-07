import { getCarePlanCatalog } from "@/app/actions/care-plans"
import { getPlaceHolderAddOns, getUserSubscription } from "@/app/actions/membership"
import RenewalWorkflow from "@/components/yoga/member/renewal-workflow"

export default async function RenewMembershipPage() {
  const plansResult = await getCarePlanCatalog()
  const plans = plansResult.success && plansResult.data ? plansResult.data : []
  const addOns = await getPlaceHolderAddOns()
  const subscription = await getUserSubscription()
  const isNew = !subscription || subscription.status === 'EXPIRED'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isNew ? "Purchase Membership" : "Renew Membership"}</h1>
        <p className="text-slate-600 mt-1">{isNew ? "Choose a plan for your new membership." : "Choose a plan for your renewal."}</p>
      </div>

      <RenewalWorkflow plans={plans} addOns={addOns} isNew={isNew} />
    </div>
  )
}
