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
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome, {session?.user?.name || "Member"}
          </h1>
          <p className="text-slate-600 mt-2">
            Manage your Sunshine Eldercare membership and services.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 px-5 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Fingerprint className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Member ID</p>
            <p className="font-mono font-bold text-slate-900">{memberProfile?.memberId || "UNASSIGNED"}</p>
          </div>
        </div>
      </div>

      {!subscription ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Active Membership</h2>
          <p className="text-slate-600 mb-6">Your membership has not been activated yet.</p>
          <Link 
            href="/dashboard/renew" 
            className="inline-flex justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-colors"
          >
            Choose Membership
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              {subscription.carePlan?.name || "Unknown Plan"}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide
              ${subscription.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 
                subscription.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                subscription.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400' :
                subscription.status === 'EXPIRED' ? 'bg-red-500/10 text-red-400' :
                'bg-slate-500/10 text-slate-300'}`}
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
            <div className="bg-red-50 px-6 py-4 border-t border-red-100 flex justify-between items-center">
              <p className="text-sm text-red-800 font-medium">Your membership has expired.</p>
              <Link 
                href="/dashboard/renew"
                className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors"
              >
                Renew Membership
              </Link>
            </div>
          )}
        </div>
      )}

      {renewalState && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-500" /> 
            Membership Renewal Status
          </h2>
          
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
            <p className="font-semibold text-slate-900">{renewalState.renewal.planName}</p>
            <p className="text-sm text-slate-500 mb-4">{renewalState.renewal.durationMonths} Months • {renewalState.renewal.variantType}</p>
            
            {!renewalState.payment && renewalState.renewal.status === 'SUBMITTED' && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md font-medium text-sm border border-amber-100">
                <Clock className="h-4 w-4" /> Awaiting Admin Approval
              </div>
            )}

            {!renewalState.payment && renewalState.renewal.status === 'APPROVED' && (
              <div>
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-md font-medium text-sm border border-blue-100 mb-4">
                  <AlertCircle className="h-4 w-4" /> Payment Required
                </div>
                <form action={async () => {
                  "use server"
                  await initiateRenewalCheckout(renewalState.renewal.id)
                }}>
                  <button type="submit" className="bg-gold px-4 py-2 rounded-md font-bold text-brown text-sm hover:opacity-90 transition-opacity">
                    Proceed to Checkout
                  </button>
                </form>
              </div>
            )}

            {renewalState.payment && renewalState.payment.status === 'VERIFICATION_PENDING' && (
              <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-3 py-2 rounded-md font-medium text-sm border border-indigo-100">
                <Clock className="h-4 w-4" /> Payment Pending Verification
              </div>
            )}

            {renewalState.payment && renewalState.payment.status === 'VERIFIED' && (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md font-medium text-sm border border-emerald-100">
                <CheckCircle2 className="h-4 w-4" /> Payment Verified
              </div>
            )}

            {renewalState.payment && renewalState.payment.status === 'REJECTED' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-2 rounded-md font-medium text-sm border border-red-100">
                  <AlertCircle className="h-4 w-4" /> Payment Verification Rejected
                </div>
                {renewalState.payment.notes && (
                  <p className="text-xs text-red-600 ml-1">Reason: {renewalState.payment.notes}</p>
                )}
                <form action={async () => {
                  "use server"
                  await initiateRenewalCheckout(renewalState.renewal.id)
                }} className="mt-2">
                  <button type="submit" className="bg-slate-900 px-4 py-2 rounded-md font-bold text-white text-sm hover:opacity-90 transition-opacity">
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
