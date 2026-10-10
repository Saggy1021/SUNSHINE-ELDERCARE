import { AdminOnboardingForm } from "./admin-onboarding-form"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"
import { db } from "@/lib/db"

export default async function AdminNewMemberPage() {
  const plans = await db.plan.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  })
  
  const addOns = await db.addOn.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/members" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" /> Member Onboarding
          </h1>
          <p className="text-slate-600 mt-1">Register a new member, assign a plan, and initialize billing.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <AdminOnboardingForm plans={plans} addOns={addOns} />
      </div>
    </div>
  )
}
