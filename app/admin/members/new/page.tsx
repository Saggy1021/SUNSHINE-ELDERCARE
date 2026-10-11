import { AdminOnboardingForm } from "./admin-onboarding-form"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"
import { carePricingService } from "@/lib/services/care-plans"

export default async function AdminNewMemberPage() {
  const catalog = await carePricingService.getCatalog()
  
  // Expand the hierarchical catalog into flat, selectable base plans for the radio buttons
  const plans = catalog.flatMap(plan =>
    plan.variants.flatMap(variant =>
      variant.durations.map(duration => ({
        id: `${plan.slug}|${variant.variantType}|${duration.months}`,
        name: `${plan.name} - ${variant.variantType === 'SINGLE' ? 'Single' : 'Couple'} (${duration.months} Month${duration.months > 1 ? 's' : ''})`,
        price: duration.documentedTotal,
        slug: plan.slug,
        variantType: variant.variantType,
        months: duration.months
      }))
    )
  )

  // Currently, the public website (CarePlan architecture) does not offer any add-ons.
  const addOns: any[] = []

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/members"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
          title="Back to Members"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-[#091329]" /> Member Onboarding
          </h1>
          <p className="text-sm text-slate-500 mt-1">Register a new member, assign an authoritative Care Plan, and initialize billing.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <AdminOnboardingForm plans={plans} addOns={addOns} />
      </div>
    </div>
  )
}
