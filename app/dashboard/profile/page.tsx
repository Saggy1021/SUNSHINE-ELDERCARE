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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">My Profile</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information, address, and primary contact details.</p>
        </div>
      </div>

      <MemberProfileForm profile={profile} />
    </div>
  )
}
