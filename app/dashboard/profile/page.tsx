import { getMemberProfile } from "@/app/actions/profile"
import MemberProfileForm from "./member-profile-form"

export default async function ProfilePage() {
  const profile = await getMemberProfile()

  if (!profile) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Profile Not Found</h2>
        <p className="text-slate-600">We could not locate your member profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-600 mt-1">Manage your basic information and contact details.</p>
      </div>

      <MemberProfileForm profile={profile} />
    </div>
  )
}
