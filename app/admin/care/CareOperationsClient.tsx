"use client";

import { useState } from "react";
import { Plus, X, Users, Clock, FileText } from "lucide-react";
import { createCareOperation } from "@/app/actions/care-operations";
import { useRouter } from "next/navigation";

export function CareOperationsClient({ operations, cases, employees, canManage }: any) {
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedEmployees.length === 0) return alert("Select at least one employee.");
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.append("employeeIds", JSON.stringify(selectedEmployees));
      await createCareOperation(fd);
      setShowCreate(false);
      setSelectedEmployees([]);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Schedule Operation
          </button>
        </div>
      )}

      {showCreate && canManage && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl relative">
          <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-semibold text-blue-900 mb-4 text-lg">Schedule Care Operation</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Care Case (Elder)</label>
                <select name="careCaseId" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">-- Select Case --</option>
                  {cases.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.elder.firstName} {c.elder.lastName} ({c.elder.user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" name="date" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <input type="time" name="startTime" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <input type="time" name="endTime" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
                <textarea name="description" required rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Details of the operation..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Assign Employees</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-slate-300 rounded-lg bg-white">
                  {employees.map((emp: any) => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEmployees(prev => [...prev, emp.id]);
                          else setSelectedEmployees(prev => prev.filter(id => id !== emp.id));
                        }}
                      />
                      {emp.firstName} {emp.lastName}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button disabled={loading} type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Scheduling..." : "Schedule Operation"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Elder</th>
                <th className="px-5 py-3">Schedule</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Assigned Team</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    No care operations scheduled.
                  </td>
                </tr>
              ) : (
                operations.map((op: any) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {op.careCase?.elder?.firstName} {op.careCase?.elder?.lastName}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {new Date(op.scheduledStart).toLocaleDateString("en-IN")}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 pl-5.5">
                        {new Date(op.scheduledStart).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(op.scheduledEnd).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-start gap-1.5 max-w-xs">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate" title={op.operationalNotes}>{op.operationalNotes || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {op.assignments?.length > 0 ? (
                          op.assignments.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded w-max">
                              <Users className="h-3 w-3 text-slate-500" />
                              {a.employee.firstName} {a.employee.lastName}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {op.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
