import { getEmergencyContact, updateEmergencyContact } from "@/app/actions/membership"
import { ShieldAlert } from "lucide-react"

export default async function EmergencyContactPage() {
  const contact = await getEmergencyContact()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-500" />
          Emergency Contact
        </h1>
        <p className="text-slate-600 mt-1">Manage your primary emergency contact information.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl">
        <form action={updateEmergencyContact} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" name="fullName" defaultValue={contact?.fullName || ""} required className="w-full border border-slate-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <input type="text" name="relationship" defaultValue={contact?.relationship || ""} required className="w-full border border-slate-300 rounded-md p-2" />
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone</label>
              <input type="tel" name="phone" defaultValue={contact?.phone || ""} required className="w-full border border-slate-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Phone (Optional)</label>
              <input type="tel" name="alternatePhone" defaultValue={contact?.alternatePhone || ""} className="w-full border border-slate-300 rounded-md p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address (Optional)</label>
            <input type="email" name="email" defaultValue={contact?.email || ""} className="w-full border border-slate-300 rounded-md p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address (Optional)</label>
            <textarea name="address" defaultValue={contact?.address || ""} className="w-full border border-slate-300 rounded-md p-2" rows={2} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medical/Important Notes (Optional)</label>
            <textarea name="notes" defaultValue={contact?.notes || ""} className="w-full border border-slate-300 rounded-md p-2" rows={2} />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-amber-500 text-white font-semibold px-6 py-2 rounded-md hover:bg-amber-600 transition-colors">
              Save Emergency Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
