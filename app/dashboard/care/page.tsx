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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Care Tracking</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Care Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor care activities, scheduled visits, and operational logs for your loved ones.</p>
        </div>
      </div>

      {elders.length === 0 ? (
        <div className="bg-card p-10 rounded-xl border border-border/60 shadow-xs text-center text-muted-foreground text-sm max-w-lg mx-auto">
          No care recipients registered under your family account yet.
        </div>
      ) : (
        <div className="space-y-6">
          {elders.map(elder => (
            <div key={elder.id} className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-border/40 bg-muted/15 flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#091329] dark:text-white">{elder.firstName} {elder.lastName}</h3>
                <span className="text-xs text-muted-foreground font-medium px-2.5 py-0.5 rounded-full bg-muted border border-border/40">Relationship: {elder.relationship}</span>
              </div>
              
              <div className="p-6">
                {elder.cases.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No active care cases configured.</p>
                ) : (
                  <div className="space-y-6">
                    {elder.cases.map(careCase => (
                      <div key={careCase.id} className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                          <h4 className="font-semibold text-foreground text-sm">
                            {careCase.subscription?.carePlan?.name || careCase.subscription?.customPlan?.name || "Care Plan"}
                          </h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                            {careCase.status}
                          </span>
                        </div>

                        {/* Recent Visits */}
                        <div>
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Recent & Upcoming Visits</h5>
                          {careCase.visits.length === 0 ? (
                            <p className="text-muted-foreground text-xs bg-muted/20 p-3 rounded-lg border border-border/40">No visits scheduled for this care case.</p>
                          ) : (
                            <ul className="space-y-2">
                              {careCase.visits.map(visit => (
                                <li key={visit.id} className="text-xs flex justify-between items-center p-3 bg-muted/20 rounded-lg border border-border/40">
                                  <span className="font-medium text-foreground">{new Date(visit.scheduledStart).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                  <span className="text-muted-foreground">{new Date(visit.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - {new Date(visit.scheduledEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-muted rounded border border-border/40 text-foreground">{visit.status}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Member Visible Notes */}
                        <div>
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Care Updates & Observations</h5>
                          {careCase.notes.length === 0 ? (
                            <p className="text-muted-foreground text-xs bg-muted/20 p-3 rounded-lg border border-border/40">No updates posted yet.</p>
                          ) : (
                            <ul className="space-y-2.5">
                              {careCase.notes.map(note => (
                                <li key={note.id} className="text-xs p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                  <p className="text-foreground leading-relaxed">{note.note}</p>
                                  <div className="mt-2 text-[11px] text-muted-foreground flex justify-between pt-1.5 border-t border-amber-500/10">
                                    <span>By {note.author.name}</span>
                                    <span>{new Date(note.createdAt).toLocaleDateString('en-GB')}</span>
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
