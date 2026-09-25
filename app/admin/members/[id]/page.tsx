import { getMemberDetails } from "@/app/actions/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserSquare2, Shield, ShieldAlert, CheckCircle2, AlertCircle, Clock, CalendarDays } from "lucide-react"

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const member = await getMemberDetails(params.id)
  
  if (!member) notFound()

  const currentSubscription = member.subscriptions[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/members" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserSquare2 className="h-6 w-6 text-blue-600" /> Member Details
          </h1>
          <p className="text-slate-600 mt-1">ID: {member.id}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile & Emergency */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Profile</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Name</p>
                <p className="font-semibold text-slate-900">{member.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Email</p>
                <p className="font-semibold text-slate-900">{member.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Joined</p>
                <p className="font-semibold text-slate-900">{member.createdAt.toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Role</p>
                <span className={`inline-flex mt-1 text-xs font-semibold px-2 py-1 rounded-md ${member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {member.role}
                </span>
              </div>
            </div>
          </div>

          {member.emergencyContact && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" /> Emergency Contact
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Name & Relationship</p>
                  <p className="font-semibold text-slate-900">{member.emergencyContact.fullName} ({member.emergencyContact.relationship})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-900">{member.emergencyContact.phone}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Membership & History */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Current Membership */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" /> Current Membership
              </h2>
              {currentSubscription && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide
                  ${currentSubscription.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 
                    currentSubscription.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                    currentSubscription.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400' :
                    currentSubscription.status === 'EXPIRED' ? 'bg-red-500/10 text-red-400' :
                    'bg-slate-500/10 text-slate-300'}`}
                >
                  {currentSubscription.status}
                </span>
              )}
            </div>
            <div className="p-6">
              {!currentSubscription ? (
                <p className="text-slate-500 text-sm">No active or historical membership found.</p>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Plan</p>
                      <p className="text-slate-900 font-semibold">{currentSubscription.carePlan?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Variant / Duration</p>
                      <p className="text-slate-900 font-semibold">{currentSubscription.variantType} / {currentSubscription.durationMonths} Months</p>
                    </div>
                    {currentSubscription.startDate && (
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" /> Start Date
                        </p>
                        <p className="text-slate-900 font-semibold">
                          {currentSubscription.startDate.toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    )}
                    {currentSubscription.endDate && (
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                          <Clock className="h-4 w-4" /> End Date
                        </p>
                        <p className="text-slate-900 font-semibold">
                          {currentSubscription.endDate.toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    )}
                  </div>
                  {currentSubscription.addOns.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <h3 className="text-sm font-medium text-slate-900 mb-2">Add-ons</h3>
                      <ul className="space-y-1">
                        {currentSubscription.addOns.map(sa => (
                          <li key={sa.id} className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {sa.addOn.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Renewal Requests */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Renewal Requests</h2>
            {member.renewalRequests.length === 0 ? (
              <p className="text-slate-500 text-sm">No renewal requests.</p>
            ) : (
              <div className="space-y-3">
                {member.renewalRequests.map(req => (
                  <div key={req.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{req.planName} ({req.durationMonths}m)</p>
                      <p className="text-xs text-slate-500 mt-1">Requested Start: {req.requestedStartDate.toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                      ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'}`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
