import { getUserSubscription } from "@/app/actions/membership"
import { auth } from "@/auth"
import Link from "next/link"
import { CheckCircle2, ShieldAlert } from "lucide-react"

export default async function MembershipDetailsPage() {
  const session = await auth()
  const subscription = await getUserSubscription()

  if (!subscription) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No Membership Found</h2>
        <p className="text-slate-600 mb-6">You don't currently have an active membership to view.</p>
        <Link href="/dashboard/renew" className="text-amber-600 font-semibold hover:text-amber-700">
          Choose a Membership &rarr;
        </Link>
      </div>
    )
  }

  const variant = subscription.carePlan?.variants[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Membership Details</h1>
        <p className="text-slate-600 mt-1">Detailed view of your current membership inclusions.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{subscription.carePlan?.name}</h2>
          <p className="text-slate-500 text-sm">{subscription.variantType} • {subscription.durationMonths} Months</p>
        </div>

        {variant && variant.services.length > 0 ? (
          <div className="p-6">
            <h3 className="text-sm font-medium text-slate-900 mb-4">Included Services</h3>
            <ul className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
              {variant.services.map(service => (
                <li key={service.id} className="flex gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-800 block">{service.serviceName}</span>
                    {service.serviceNote && (
                      <span className="text-slate-500 text-xs mt-0.5 block">{service.serviceNote}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-6 flex items-center justify-center text-slate-500 text-sm">
            No services listed for this plan.
          </div>
        )}
      </div>
    </div>
  )
}
