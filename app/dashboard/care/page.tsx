import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function MemberCarePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/care")
  }

  // Fetch care cases related to the member's elders
  const elders = await db.elder.findMany({
    where: { userId: session.user.id },
    include: {
      cases: {
        include: {
          subscription: {
            include: {
              carePlan: true,
              customPlan: true,
            }
          },
          visits: {
            where: {
              status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] }
            },
            orderBy: { scheduledStart: 'desc' },
            take: 5,
          },
          notes: {
            where: { visibility: 'MEMBER_VISIBLE' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { author: true }
          }
        }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Care Tracking</h1>
        <p className="text-slate-500 mt-2">Monitor care activities and updates for your loved ones.</p>
      </div>

      {elders.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-500">No care recipients registered yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {elders.map(elder => (
            <div key={elder.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">{elder.firstName} {elder.lastName} ({elder.relationship})</h3>
              </div>
              
              <div className="p-6">
                {elder.cases.length === 0 ? (
                  <p className="text-slate-500 text-sm">No active care cases.</p>
                ) : (
                  <div className="space-y-6">
                    {elder.cases.map(careCase => (
                      <div key={careCase.id} className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-slate-800">
                            {careCase.subscription?.carePlan?.name || careCase.subscription?.customPlan?.name || "Care Plan"}
                          </h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {careCase.status}
                          </span>
                        </div>

                        {/* Recent Visits */}
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-2">Recent & Upcoming Visits</h5>
                          {careCase.visits.length === 0 ? (
                            <p className="text-slate-500 text-xs">No visits scheduled.</p>
                          ) : (
                            <ul className="space-y-2">
                              {careCase.visits.map(visit => (
                                <li key={visit.id} className="text-sm flex justify-between p-3 bg-slate-50 rounded-lg">
                                  <span>{new Date(visit.scheduledStart).toLocaleDateString()}</span>
                                  <span className="text-slate-500">{new Date(visit.scheduledStart).toLocaleTimeString()} - {new Date(visit.scheduledEnd).toLocaleTimeString()}</span>
                                  <span className="text-xs font-medium px-2 py-1 bg-slate-200 rounded">{visit.status}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Member Visible Notes */}
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-2">Care Updates</h5>
                          {careCase.notes.length === 0 ? (
                            <p className="text-slate-500 text-xs">No updates available.</p>
                          ) : (
                            <ul className="space-y-3">
                              {careCase.notes.map(note => (
                                <li key={note.id} className="text-sm p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                  <p className="text-slate-700">{note.note}</p>
                                  <div className="mt-2 text-xs text-slate-500 flex justify-between">
                                    <span>By {note.author.name}</span>
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
