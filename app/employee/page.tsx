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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Schedule</h1>
        <p className="text-slate-500 mt-1">Upcoming care operations and assignments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Upcoming Operations</h2>
          {upcomingVisits.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 text-sm">
              No upcoming operations assigned.
            </div>
          ) : (
            upcomingVisits.map(visit => (
              <div key={visit.id} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {visit.careCase.elder.firstName} {visit.careCase.elder.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {new Date(visit.scheduledStart).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric' })} • {new Date(visit.scheduledStart).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })} - {new Date(visit.scheduledEnd).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100">
                    {visit.status}
                  </span>
                </div>
                
                <div className="space-y-2 mt-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex gap-2">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{visit.operationalNotes || "No specific instructions."}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-200 mt-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{visit.careCase.elder.user.memberProfile?.serviceAddress || "Address not provided"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mr-1">Care Team:</span>
                  {visit.assignments.map(a => (
                    <span key={a.id} className={`text-xs px-2 py-1 rounded-full ${a.employee.id === employee.id ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-slate-100 text-slate-600'}`}>
                      {a.employee.firstName} {a.employee.lastName} {a.employee.id === employee.id && "(You)"}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Past Operations</h2>
          {pastVisits.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 text-sm">
              No past operations.
            </div>
          ) : (
            pastVisits.slice(0, 5).map(visit => (
              <div key={visit.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-80">
                <div className="flex justify-between">
                  <h3 className="font-medium text-slate-800">
                    {visit.careCase.elder.firstName} {visit.careCase.elder.lastName}
                  </h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {visit.status}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {new Date(visit.scheduledStart).toLocaleDateString("en-IN")} • {new Date(visit.scheduledStart).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
