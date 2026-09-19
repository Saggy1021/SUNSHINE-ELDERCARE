import { getFeedbackHistory, submitFeedback } from "@/app/actions/membership"
import { MessageSquarePlus } from "lucide-react"

export default async function FeedbackPage() {
  const history = await getFeedbackHistory()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquarePlus className="h-6 w-6 text-amber-500" />
          Feedback & Support
        </h1>
        <p className="text-slate-600 mt-1">Let us know about your experience with Sunshine Elder Care.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Submit Feedback</h2>
          <form action={submitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select name="category" required className="w-full border border-slate-300 rounded-md p-2">
                <option value="GENERAL">General Feedback</option>
                <option value="SERVICE_QUALITY">Service Quality</option>
                <option value="CARE_PLAN">Care Plan</option>
                <option value="SUPPORT">Support Request</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
              <select name="rating" required className="w-full border border-slate-300 rounded-md p-2">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Terrible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea name="message" required className="w-full border border-slate-300 rounded-md p-2" rows={4} placeholder="Please detail your experience..." />
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-amber-500 text-white font-semibold px-6 py-2 rounded-md hover:bg-amber-600 transition-colors">
                Submit Feedback
              </button>
            </div>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Past Feedback</h2>
          {history.length === 0 ? (
            <p className="text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">You haven't submitted any feedback yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{item.category.replace('_', ' ')}</span>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-full text-slate-600">{item.status}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{item.message}</p>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Rating: {item.rating}/5</span>
                    <span>{item.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
