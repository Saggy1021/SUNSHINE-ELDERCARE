import { getInquiries } from "@/app/actions/admin"
import { ClipboardList } from "lucide-react"

export default async function AdminInquiriesPage() {
  const inquiries = await getInquiries()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[#091329]" /> Inquiries
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage incoming public inquiries and consult requests.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Name / Contact</th>
                <th className="px-5 py-3.5">Message</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No inquiries found.
                  </td>
                </tr>
              ) : inquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{inq.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inq.email}</p>
                    {inq.phone && <p className="text-xs text-slate-500">{inq.phone}</p>}
                  </td>
                  <td className="px-5 py-3.5 max-w-md">
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{inq.message}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${inq.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                        inq.status === 'IN_PROGRESS' ? 'bg-sky-50 text-sky-700 border border-sky-200/60' :
                        'bg-amber-50 text-amber-700 border border-amber-200/60'}`}
                    >
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {inq.createdAt.toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
