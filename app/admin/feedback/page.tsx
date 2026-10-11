import { getFeedback } from "@/app/actions/admin"
import { MessageSquare, Star } from "lucide-react"

export default async function AdminFeedbackPage() {
  const feedback = await getFeedback()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-[#091329]" /> Member Feedback
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review ratings, suggestions, and member satisfaction feedback.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Category / Rating</th>
                <th className="px-5 py-3.5">Message</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedback.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No feedback found.
                  </td>
                </tr>
              ) : feedback.map((fb) => (
                <tr key={fb.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{fb.user.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fb.user.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-slate-700">{fb.category}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 max-w-md">
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{fb.message}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${fb.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                        fb.status === 'RESPONDED' ? 'bg-sky-50 text-sky-700 border border-sky-200/60' :
                        'bg-amber-50 text-amber-700 border border-amber-200/60'}`}
                    >
                      {fb.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {fb.createdAt.toLocaleDateString('en-GB')}
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
