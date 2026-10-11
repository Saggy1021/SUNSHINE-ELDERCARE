import { getFeedbackHistory, submitFeedback } from "@/app/actions/membership"
import { MessageSquarePlus } from "lucide-react"

export default async function FeedbackPage() {
  const history = await getFeedbackHistory()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Feedback</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <MessageSquarePlus className="h-6 w-6 text-[#B08A4A]" />
            Feedback & Member Support
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Let our administration know about your care experience, suggestions, or service queries.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="bg-card p-6 rounded-xl border border-border/60 shadow-xs">
          <h2 className="text-sm font-semibold text-[#091329] dark:text-white mb-4 border-b border-border/40 pb-2 uppercase tracking-wider">Submit Feedback</h2>
          <form action={submitFeedback} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Category *</label>
              <select name="category" required className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]">
                <option value="GENERAL">General Feedback</option>
                <option value="SERVICE_QUALITY">Service Quality</option>
                <option value="CARE_PLAN">Care Plan</option>
                <option value="SUPPORT">Support Request</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Rating (1-5) *</label>
              <select name="rating" required className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Terrible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Message *</label>
              <textarea name="message" required className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" rows={4} placeholder="Please detail your experience or request..." />
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-[#091329] text-white font-medium text-xs py-2.5 rounded-lg hover:bg-[#162850] shadow-xs transition-colors">
                Submit Feedback
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#091329] dark:text-white uppercase tracking-wider">Your Past Submissions</h2>
          {history.length === 0 ? (
            <div className="bg-card p-8 rounded-xl border border-border/60 text-center text-muted-foreground text-sm shadow-xs">
              You haven't submitted any feedback yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(item => (
                <div key={item.id} className="bg-card p-4 rounded-xl border border-border/60 shadow-xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-foreground">{item.category.replace('_', ' ')}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-muted rounded-full text-muted-foreground border border-border/40 uppercase">{item.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{item.message}</p>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                    <span className="font-medium text-[#B08A4A]">Rating: {item.rating}/5</span>
                    <span>{item.createdAt.toLocaleDateString('en-GB')}</span>
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
