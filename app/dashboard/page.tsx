import { db } from "@/lib/db"
import { getUserSubscription, getUserRenewalState } from "@/app/actions/membership"
import { auth } from "@/auth"
import Link from "next/link"
import { Shield, Clock, CalendarDays, CheckCircle2, Receipt, AlertCircle, Fingerprint } from "lucide-react"
import { initiateRenewalCheckout } from "@/app/actions/checkout"

export default async function DashboardPage() {
  const session = await auth()
  const subscription = await getUserSubscription()
  const renewalState = await getUserRenewalState()
  
  let memberProfile = null;
  if (session?.user?.id) {
    memberProfile = await db.memberProfile.findUnique({
      where: { userId: session.user.id }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Overview</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">
            Welcome, {session?.user?.name || "Member"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your Sunshine Eldercare care plan, family profiles, and membership perks.
          </p>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3 px-4 flex items-center gap-3 shadow-xs">
          <div className="bg-[#091329]/10 dark:bg-amber-500/10 p-2 rounded-lg text-[#091329] dark:text-amber-400">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Member ID</p>
            <p className="font-mono font-bold text-foreground text-sm">{memberProfile?.memberId || "UNASSIGNED"}</p>
          </div>
        </div>
      </div>

      {!subscription ? (
        <div className="bg-card p-10 rounded-xl border border-border/60 shadow-xs text-center max-w-xl mx-auto">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 text-[#B08A4A] flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No Active Membership</h2>
          <p className="text-sm text-muted-foreground mb-6">Your eldercare membership has not been activated yet. Choose a care plan to begin services.</p>
          <Link 
            href="/dashboard/renew" 
            className="inline-flex justify-center rounded-lg bg-[#091329] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#162850] transition-colors"
          >
            Choose Membership
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
          <div className="bg-[#091329] px-6 py-4 flex justify-between items-center text-white border-b border-[#162850]">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#B08A4A]" />
              {subscription.carePlan?.name || "Care Plan"}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide
              ${subscription.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                subscription.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                subscription.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                subscription.status === 'EXPIRED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                'bg-slate-500/20 text-slate-300 border border-slate-500/30'}`}
            >
              {subscription.status}
            </span>
          </div>

          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Variant</p>
                <p className="text-slate-900 font-semibold">{subscription.variantType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Duration</p>
                <p className="text-slate-900 font-semibold">{subscription.durationMonths} Months</p>
              </div>
              
              {subscription.startDate && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" /> Start Date
                  </p>
                  <p className="text-slate-900 font-semibold">
                    {subscription.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}

              {subscription.endDate && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> End Date
                  </p>
                  <p className="text-slate-900 font-semibold">
                    {subscription.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            {subscription.addOns.length > 0 && (
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-medium text-slate-900 mb-3">Selected Add-ons</h3>
                <ul className="space-y-2">
                  {subscription.addOns.map(sa => (
                    <li key={sa.id} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {sa.addOn.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {subscription.status === 'EXPIRED' && !renewalState && (
            <div className="bg-red-500/10 px-6 py-4 border-t border-red-500/20 flex justify-between items-center">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">Your membership has expired.</p>
              <Link 
                href="/dashboard/renew"
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors shadow-xs"
              >
                Renew Membership
              </Link>
            </div>
          )}
        </div>
      )}

      {renewalState && (
        <div className="bg-card rounded-xl border border-border/60 shadow-xs p-6">
          <h2 className="text-base font-semibold text-[#091329] dark:text-white mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#B08A4A]" />
            Membership Renewal Status
          </h2>
          
          <div className="bg-muted/30 border border-border/40 rounded-xl p-5">
            <p className="font-semibold text-foreground text-base">{renewalState.renewal.planName}</p>
            <p className="text-xs text-muted-foreground mb-4">{renewalState.renewal.durationMonths} Months • {renewalState.renewal.variantType}</p>
            
            {!renewalState.payment && renewalState.renewal.status === 'SUBMITTED' && (
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3.5 py-2.5 rounded-lg font-medium text-xs border border-amber-500/20">
                <Clock className="h-4 w-4" /> Awaiting Admin Approval
              </div>
            )}

            {!renewalState.payment && renewalState.renewal.status === 'APPROVED' && (
              <div>
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 bg-blue-500/10 px-3.5 py-2.5 rounded-lg font-medium text-xs border border-blue-500/20 mb-4">
                  <AlertCircle className="h-4 w-4" /> Payment Required
                </div>
                <form action={async () => {
                  "use server"
                  await initiateRenewalCheckout(renewalState.renewal.id)
                }}>
                  <button type="submit" className="bg-[#091329] text-white hover:bg-[#162850] px-4 py-2 rounded-lg font-medium text-xs shadow-xs transition-colors">
                    Proceed to Checkout
                  </button>
                </form>
              </div>
            )}

            {renewalState.payment && renewalState.payment.status === 'VERIFICATION_PENDING' && (
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 bg-indigo-500/10 px-3.5 py-2.5 rounded-lg font-medium text-xs border border-indigo-500/20">
                <Clock className="h-4 w-4" /> Payment Pending Verification
              </div>
            )}

            {renewalState.payment && renewalState.payment.status === 'VERIFIED' && (
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-3.5 py-2.5 rounded-lg font-medium text-xs border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" /> Payment Verified
              </div>
            )}

            {renewalState.payment && renewalState.payment.status === 'REJECTED' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 bg-rose-500/10 px-3.5 py-2.5 rounded-lg font-medium text-xs border border-rose-500/20">
                  <AlertCircle className="h-4 w-4" /> Payment Verification Rejected
                </div>
                {renewalState.payment.notes && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 ml-1">Reason: {renewalState.payment.notes}</p>
                )}
                <form action={async () => {
                  "use server"
                  await initiateRenewalCheckout(renewalState.renewal.id)
                }} className="mt-2">
                  <button type="submit" className="bg-[#091329] text-white hover:bg-[#162850] px-4 py-2 rounded-lg font-medium text-xs shadow-xs transition-colors">
                    Retry Payment
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
