import { getUserSubscription } from "@/app/actions/membership"
import Link from "next/link"
import { ArrowRight, RefreshCw, PlusCircle } from "lucide-react"

export default async function ManageMembershipPage() {
  const subscription = await getUserSubscription()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Membership</h1>
        <p className="text-slate-600 mt-1">Update your preferences and manage renewals.</p>
      </div>

      {!subscription ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-slate-600 mb-4">You do not have a membership to manage.</p>
          <Link href="/dashboard/renew" className="text-amber-600 font-medium hover:text-amber-700 flex items-center gap-2">
            Get a Membership <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/dashboard/renew" className="block group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all h-full">
              <RefreshCw className="h-8 w-8 text-amber-500 mb-4 group-hover:rotate-180 transition-transform duration-500" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Renew Membership</h2>
              <p className="text-sm text-slate-500">Extend your membership duration or switch to a different package.</p>
            </div>
          </Link>
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 opacity-75 cursor-not-allowed">
            <PlusCircle className="h-8 w-8 text-slate-400 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Manage Add-ons</h2>
            <p className="text-sm text-slate-500">Modify your selected add-on perks. (Coming soon)</p>
          </div>
        </div>
      )}
    </div>
  )
}
