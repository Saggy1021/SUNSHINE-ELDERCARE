import { getFeedback } from "@/app/actions/admin"
import { MessageSquare, Star } from "lucide-react"

export default async function AdminFeedbackPage() {
  const feedback = await getFeedback()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-purple-600" /> Feedback
          </h1>
          <p className="text-slate-600 mt-1">Review and manage member feedback.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Category / Rating</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
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
                <tr key={fb.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{fb.user.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{fb.user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-700">{fb.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{fb.message}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                      ${fb.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                        fb.status === 'RESPONDED' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'}`}
                    >
                      {fb.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
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
