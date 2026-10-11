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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">My Membership</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Membership Details</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Detailed view of your current membership inclusions and services.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-border/40 bg-muted/10">
          <h2 className="text-lg font-semibold text-[#091329] dark:text-white">{subscription.carePlan?.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subscription.variantType} • {subscription.durationMonths} Months</p>
        </div>

        {variant && variant.services.length > 0 ? (
          <div className="p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Included Services</h3>
            <ul className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
              {variant.services.map(service => (
                <li key={service.id} className="flex gap-3 text-sm p-3 rounded-lg bg-muted/20 border border-border/40">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground block">{service.serviceName}</span>
                    {service.serviceNote && (
                      <span className="text-muted-foreground text-xs mt-0.5 block">{service.serviceNote}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">
            No specific services listed for this plan.
          </div>
        )}
      </div>
    </div>
  )
}
