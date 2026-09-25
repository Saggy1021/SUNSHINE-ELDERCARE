import { getInquiries } from "@/app/actions/admin"
import { ClipboardList } from "lucide-react"

export default async function AdminInquiriesPage() {
  const inquiries = await getInquiries()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" /> Inquiries
          </h1>
          <p className="text-slate-600 mt-1">Manage public contact inquiries.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Name / Contact</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
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
                <tr key={inq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{inq.fullName}</p>
                    <p className="text-xs text-slate-500">{inq.email}</p>
                    <p className="text-xs text-slate-500">{inq.phone}</p>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{inq.message}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                      ${inq.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                        inq.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'}`}
                    >
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
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
