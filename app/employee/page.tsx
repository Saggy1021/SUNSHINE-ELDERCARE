import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CalendarDays, Clock, MapPin, User, FileText, CheckCircle2 } from "lucide-react";

export const metadata = { title: "My Schedule — Staff Portal" };

export default async function EmployeeSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const employee = await db.employee.findUnique({
    where: { userId: session.user.id }
  });

  if (!employee) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <p className="text-slate-500">Your employee profile is not fully set up. Contact administration.</p>
      </div>
    );
  }

  // Get assignments for this employee
  const assignments = await db.visitAssignment.findMany({
    where: { employeeId: employee.id },
    include: {
      visit: {
        include: {
          careCase: {
            include: { elder: { include: { user: { include: { memberProfile: true } } } } }
          },
          assignments: {
            include: { employee: true }
          }
        }
      }
    },
    orderBy: { visit: { scheduledStart: 'asc' } }
  });

  const upcomingVisits = assignments.filter(a => new Date(a.visit.scheduledEnd) > new Date()).map(a => a.visit);
  const pastVisits = assignments.filter(a => new Date(a.visit.scheduledEnd) <= new Date()).map(a => a.visit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Staff</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">My Schedule</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#091329] dark:text-amber-400" /> My Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upcoming care operations, eldercare visits, and daily assignments.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h2 className="text-sm font-semibold text-[#091329] dark:text-white uppercase tracking-wider">Upcoming Operations</h2>
            <span className="text-xs text-muted-foreground font-medium">{upcomingVisits.length} scheduled</span>
          </div>
          {upcomingVisits.length === 0 ? (
            <div className="bg-card p-8 rounded-xl border border-border/60 shadow-xs text-center text-muted-foreground text-sm">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No upcoming operations assigned at this time.
            </div>
          ) : (
            upcomingVisits.map(visit => (
              <div key={visit.id} className="bg-card p-5 rounded-xl border border-border/60 shadow-xs relative overflow-hidden transition-all hover:border-[#091329]/30 dark:hover:border-amber-400/40">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#091329] dark:bg-[#B08A4A]"></div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">
                      {visit.careCase.elder.firstName} {visit.careCase.elder.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(visit.scheduledStart).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric' })} • {new Date(visit.scheduledStart).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })} - {new Date(visit.scheduledEnd).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="bg-amber-500/10 text-amber-900 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-500/20">
                    {visit.status}
                  </span>
                </div>
                
                <div className="space-y-2 mt-4 text-xs bg-muted/40 p-3.5 rounded-lg border border-border/40">
                  <div className="flex gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground leading-relaxed">{visit.operationalNotes || "No specific instructions provided."}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/40 mt-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{visit.careCase.elder.user.memberProfile?.serviceAddress || "Address not provided"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Care Team:</span>
                  {visit.assignments.map(a => (
                    <span key={a.id} className={`text-xs px-2.5 py-0.5 rounded-full border ${a.employee.id === employee.id ? 'bg-[#091329] text-white border-[#091329] dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-medium' : 'bg-muted text-muted-foreground border-border/60'}`}>
                      {a.employee.firstName} {a.employee.lastName} {a.employee.id === employee.id && " (You)"}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h2 className="text-sm font-semibold text-[#091329] dark:text-white uppercase tracking-wider">Past Operations</h2>
            <span className="text-xs text-muted-foreground font-medium">{pastVisits.length} recorded</span>
          </div>
          {pastVisits.length === 0 ? (
            <div className="bg-card p-8 rounded-xl border border-border/60 shadow-xs text-center text-muted-foreground text-sm">
              No past operations recorded.
            </div>
          ) : (
            pastVisits.slice(0, 5).map(visit => (
              <div key={visit.id} className="bg-card p-4 rounded-xl border border-border/60 shadow-xs opacity-90 transition-all hover:opacity-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-foreground text-sm">
                    {visit.careCase.elder.firstName} {visit.careCase.elder.lastName}
                  </h3>
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40">
                    <CheckCircle2 className="h-3 w-3" /> {visit.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {new Date(visit.scheduledStart).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(visit.scheduledStart).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
