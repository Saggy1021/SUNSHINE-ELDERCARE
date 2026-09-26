import { AdminMemberForm } from "./admin-member-form"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"

export default function AdminNewMemberPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/members" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" /> Create Member
          </h1>
          <p className="text-slate-600 mt-1">Register a new member manually.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <AdminMemberForm />
      </div>
    </div>
  )
}
