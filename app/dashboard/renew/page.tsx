import { getCarePlanCatalog } from "@/app/actions/care-plans"
import { getActiveAddOns } from "@/app/actions/membership"
import RenewalWorkflow from "@/components/yoga/member/renewal-workflow"

interface RenewMembershipPageProps {
  searchParams?: Promise<{
    plan?: string
    variant?: string
    duration?: string
    addOns?: string
  }>
}

export default async function RenewMembershipPage({ searchParams }: RenewMembershipPageProps) {
  const params = (await searchParams) || {}
  const plansResult = await getCarePlanCatalog()
  const plans = plansResult.success && plansResult.data ? plansResult.data : []
  const addOns = await getActiveAddOns()

  const requestedPlan = params.plan?.toLowerCase()
  const matchedPlan = plans.find(
    (p: any) => p.slug?.toLowerCase() === requestedPlan || p.id === params.plan
  )

  const initialPlanId = matchedPlan?.id || ""
  const requestedVariant = params.variant?.toUpperCase()
  const initialVariant = requestedVariant === "COUPLE" ? "COUPLE" : "SINGLE"
  const parsedDuration = params.duration ? parseInt(params.duration, 10) : 1
  const initialDuration = [1, 3, 6, 12].includes(parsedDuration) ? parsedDuration : 1
  const initialAddOnIds = params.addOns ? params.addOns.split(',').map((s) => s.trim()).filter(Boolean) : []

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

      <RenewalWorkflow
        plans={plans}
        addOns={addOns}
        initialPlanId={initialPlanId}
        initialVariantType={initialVariant}
        initialDurationMonths={initialDuration}
        initialAddOnIds={initialAddOnIds}
      />
    </div>
  )
}
