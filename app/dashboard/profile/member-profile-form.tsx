"use client"

import { useState } from "react"
import { UserCircle } from "lucide-react"

export default function MemberProfileForm({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      const formData = new FormData(e.currentTarget)
      // Import action dynamically to avoid client-side module errors if any server dependencies bleed
      const { updateMemberProfile } = await import('@/app/actions/profile')
      const res = await updateMemberProfile(formData)
      
      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || "Failed to update profile")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <UserCircle className="h-5 w-5 text-indigo-500" /> 
        Basic Information
      </h2>
      
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 text-sm">
          Profile updated successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-100 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input 
              name="firstName" 
              defaultValue={profile.firstName} 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input 
              name="lastName" 
              defaultValue={profile.lastName} 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
            <input 
              name="mobileNumber" 
              defaultValue={profile.mobileNumber} 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Number (Optional)</label>
            <input 
              name="alternateNumber" 
              defaultValue={profile.alternateNumber || ''} 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Service Address</label>
          <textarea 
            name="serviceAddress" 
            defaultValue={profile.serviceAddress} 
            required
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nearest Landmark (Optional)</label>
          <input 
            name="nearestLandmark" 
            defaultValue={profile.nearestLandmark || ''} 
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
          />
        </div>

        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
          <p className="text-xs text-slate-500 mb-2">
            Sensitive information such as ID Proof, Insurance, and Date of Birth can only be modified by contacting support to ensure security and compliance.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-700">ID Proof</p>
              <p className="text-sm text-slate-600">{profile.idProofType} - {profile.idProofNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Date of Birth</p>
              <p className="text-sm text-slate-600">{new Date(profile.dateOfBirth).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-slate-900 text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
