import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AuthorizationService } from "@/lib/services/authorization"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { redirect } from "next/navigation"

export default async function AdminCarePage() {
  const session = await auth()

  // Step 1: authentication
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/care")
  }

  // Step 2: permission-based authorization (not merely role === ADMIN)
  const canView = await AuthorizationService.can(session.user.id, PERMISSIONS.CARE_CASE_VIEW)
  if (!canView) {
    redirect("/admin") // redirect to admin home if authenticated but lacking permission
  }

  // Fetch all active care cases
  const cases = await db.careCase.findMany({
    where: { status: "ACTIVE" },
    include: {
      elder: {
        include: { user: true },
      },
      assignments: {
        where: { status: "ACTIVE" },
        include: { employee: true },
      },
      visits: {
        where: { scheduledStart: { gte: new Date() } },
        orderBy: { scheduledStart: "asc" },
        take: 3,
        include: { assignedEmp: true },
      },
      subscription: {
        include: { carePlan: true, customPlan: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Care Operations</h1>
          <p className="text-slate-500 mt-2">Manage active care cases, assignments, and visits.</p>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-500">No active care cases found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {cases.map((careCase) => (
            <div key={careCase.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {careCase.elder.firstName} {careCase.elder.lastName}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Member: {careCase.elder.user.name || careCase.elder.user.email}
                  </p>
                  <p className="text-sm font-medium text-emerald-600 mt-1">
                    {careCase.subscription?.carePlan?.name ||
                      careCase.subscription?.customPlan?.name ||
                      "Care Plan"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {careCase.status}
                  </span>
                  <div className="text-xs text-slate-400 mt-2">ID: {careCase.id}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                {/* Active Assignments */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Care Team Assignments</h4>
                  {careCase.assignments.length === 0 ? (
                    <p className="text-slate-500 text-xs">No active assignments.</p>
                  ) : (
                    <ul className="space-y-2">
                      {careCase.assignments.map((assign) => (
                        <li
                          key={assign.id}
                          className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded"
                        >
                          <span className="font-medium text-slate-700">
                            {assign.employee.firstName} {assign.employee.lastName}
                          </span>
                          <span className="text-xs text-slate-500">{assign.role}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Upcoming Visits */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Visits</h4>
                  {careCase.visits.length === 0 ? (
                    <p className="text-slate-500 text-xs">No upcoming visits.</p>
                  ) : (
                    <ul className="space-y-2">
                      {careCase.visits.map((visit) => (
                        <li key={visit.id} className="flex flex-col text-sm p-3 bg-slate-50 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-800">
                              {new Date(visit.scheduledStart).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(visit.scheduledStart).toLocaleTimeString()}
                            </span>
                          </div>
                          {visit.assignedEmp && (
                            <div className="text-xs text-slate-500 mt-1">
                              Assigned: {visit.assignedEmp.firstName} {visit.assignedEmp.lastName}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
