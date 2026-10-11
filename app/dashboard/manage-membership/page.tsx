import { getUserSubscription } from "@/app/actions/membership"
import Link from "next/link"
import { ArrowRight, RefreshCw, PlusCircle } from "lucide-react"

export default async function ManageMembershipPage() {
  const subscription = await getUserSubscription()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Manage Membership</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Manage Membership</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Update your eldercare preferences, adjust package duration, and manage renewals.</p>
        </div>
      </div>

      {!subscription ? (
        <div className="bg-card p-8 rounded-xl border border-border/60 text-center max-w-lg mx-auto">
          <p className="text-sm text-muted-foreground mb-4">You do not currently have an active membership to manage.</p>
          <Link href="/dashboard/renew" className="inline-flex items-center gap-2 text-xs font-semibold bg-[#091329] text-white px-4 py-2 rounded-lg hover:bg-[#162850] transition-colors shadow-xs">
            Choose a Membership <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          <Link href="/dashboard/renew" className="block group">
            <div className="bg-card p-6 rounded-xl border border-border/60 hover:border-[#091329]/40 dark:hover:border-amber-400/40 shadow-xs hover:shadow-sm transition-all h-full">
              <RefreshCw className="h-7 w-7 text-[#B08A4A] mb-3 group-hover:rotate-180 transition-transform duration-500" />
              <h2 className="text-base font-semibold text-foreground mb-1.5">Renew Membership</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">Extend your membership duration or transition seamlessly to another Care Plan.</p>
            </div>
          </Link>
          
          <div className="bg-muted/30 p-6 rounded-xl border border-border/40 opacity-75 cursor-not-allowed">
            <PlusCircle className="h-7 w-7 text-muted-foreground mb-3" />
            <h2 className="text-base font-semibold text-muted-foreground mb-1.5">Manage Add-ons</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">Modify your customized ancillary care perks. (Coming soon)</p>
          </div>
        </div>
      )}
    </div>
  )
}
