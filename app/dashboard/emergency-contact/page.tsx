import { getEmergencyContact, updateEmergencyContact } from "@/app/actions/membership"
import { ShieldAlert } from "lucide-react"

export default async function EmergencyContactPage() {
  const contact = await getEmergencyContact()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Emergency Contact</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            Emergency Contact Information
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your primary emergency contact, relationship, and medical directives.</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border/60 shadow-xs max-w-2xl">
        <form action={updateEmergencyContact} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Full Name *</label>
              <input type="text" name="fullName" defaultValue={contact?.fullName || ""} required className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Relationship *</label>
              <input type="text" name="relationship" defaultValue={contact?.relationship || ""} required className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" />
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Primary Phone *</label>
              <input type="tel" name="phone" defaultValue={contact?.phone || ""} required className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Alternate Phone (Optional)</label>
              <input type="tel" name="alternatePhone" defaultValue={contact?.alternatePhone || ""} className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Email Address (Optional)</label>
            <input type="email" name="email" defaultValue={contact?.email || ""} className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Address (Optional)</label>
            <textarea name="address" defaultValue={contact?.address || ""} className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" rows={2} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Medical/Important Notes (Optional)</label>
            <textarea name="notes" defaultValue={contact?.notes || ""} className="w-full border border-border/60 rounded-lg p-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#091329]" rows={2} />
          </div>

          <div className="pt-3 flex justify-end border-t border-border/40">
            <button type="submit" className="bg-[#091329] text-white font-medium text-xs px-5 py-2.5 rounded-lg hover:bg-[#162850] shadow-xs transition-colors">
              Save Emergency Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
