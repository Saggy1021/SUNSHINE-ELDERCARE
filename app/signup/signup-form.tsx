'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerUser } from '@/app/actions/auth'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sameAsSponsor, setSameAsSponsor] = useState(false)

  // Validate callback url to prevent open redirects (including protocol-relative and backslash bypasses)
  const rawCallback = searchParams.get('callbackUrl')
  const isValidCallback = rawCallback && 
    rawCallback.startsWith('/') && 
    !rawCallback.startsWith('//') && 
    !rawCallback.startsWith('/\\')
  
  const callbackUrl = isValidCallback ? rawCallback : '/dashboard'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (sameAsSponsor) {
      formData.set('emergencyContactName', formData.get('sponsorName') as string || '')
      formData.set('emergencyContactRelationship', formData.get('sponsorRelationship') as string || '')
      formData.set('emergencyContactMobile', formData.get('sponsorMobile') as string || '')
      formData.set('emergencyContactOther', formData.get('sponsorOther') as string || '')
      formData.set('emergencyContactEmail', formData.get('sponsorEmail') as string || '')
    }

    try {
      const result = await registerUser(formData)

      if (!result.success) {
        setError(result.error || "Failed to create account")
        setLoading(false)
        return
      }

      // Redirect to OTP verification page
      router.push(`/verify-email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`)
    } catch (err) {
      setError("An unexpected error occurred.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Account Info */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Account Login</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email Address *</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Password *</label>
            <input name="password" type="password" required minLength={8} className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
        </div>
      </div>

      {/* SECTION A: MEMBER DETAILS */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Section A: Member Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">First Name *</label>
            <input name="firstName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Surname / Last Name *</label>
            <input name="lastName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">ID Proof Type</label>
            <select name="idProofType" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md">
              <option value="">Select ID Proof</option>

              <option value="Voter ID">Voter ID</option>
              <option value="Passport">Passport</option>
              <option value="PAN">PAN</option>
              <option value="Driving Licence">Driving Licence</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">ID Proof Number</label>
            <input name="idProofNumber" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Upload ID Proof (Max 2MB)</label>
            <input name="idProofFile" type="file" accept=".pdf,image/jpeg,image/png" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
            <p className="mt-1 text-xs text-foreground/60">Accepted formats: PDF, JPEG, PNG. Size limit: 2MB.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Date of Birth *</label>
            <input name="dateOfBirth" type="date" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Gender *</label>
            <select name="gender" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Service Address *</label>
            <textarea name="serviceAddress" required rows={2} className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Nearest Landmark</label>
            <input name="nearestLandmark" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Primary Mobile Number *</label>
            <input name="mobileNumber" type="tel" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Alternate Number</label>
            <input name="alternateNumber" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
        </div>
      </div>

      {/* SECTION B: HEALTH / MEDICAL INFORMATION */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Section B: Health / Medical Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Existing Medical Conditions (Optional)</label>
            <textarea name="medicalConditions" rows={3} placeholder="Please list any existing medical conditions..." className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Blood Group *</label>
            <input name="bloodGroup" type="text" required placeholder="e.g., O+" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
        </div>
      </div>

      {/* SECTION C: HEALTH INSURANCE */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Section C: Health Insurance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Insurance Provider</label>
            <input name="insuranceProvider" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Card / Policy Number</label>
            <input name="policyNumber" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Coverage Amount</label>
            <input name="coverageAmount" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
        </div>
      </div>

      {/* SECTION D: SPONSOR DETAILS */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Section D: Sponsor Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Sponsor Name *</label>
            <input name="sponsorName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Relationship *</label>
            <input name="sponsorRelationship" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Primary Mobile *</label>
            <input name="sponsorMobile" type="tel" required className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Other Contact</label>
            <input name="sponsorOther" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email</label>
            <input name="sponsorEmail" type="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
        </div>
      </div>

      {/* SECTION E: EMERGENCY CONTACT */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2 gap-2">
          <h3 className="font-serif text-xl">Section E: Emergency Contact</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={sameAsSponsor}
              onChange={(e) => setSameAsSponsor(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
            />
            <span className="text-sm font-medium text-foreground/80">Same as Sponsor Details</span>
          </label>
        </div>
        
        {!sameAsSponsor && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">Contact Name *</label>
              <input name="emergencyContactName" type="text" required={!sameAsSponsor} className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">Relationship *</label>
              <input name="emergencyContactRelationship" type="text" required={!sameAsSponsor} className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">Primary Mobile *</label>
              <input name="emergencyContactMobile" type="tel" required={!sameAsSponsor} className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">Other Contact</label>
              <input name="emergencyContactOther" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email</label>
              <input name="emergencyContactEmail" type="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
            </div>
          </div>
        )}
      </div>

      {/* SECTION F: MEDICAL ALERT / HOSPITAL AUTHORIZATION */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2">Section F: Medical Alert / Hospital Auth</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Hospital for SOS</label>
            <input name="hospitalForSos" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Nominee Local Contact Number</label>
            <input name="nomineeLocalContact" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md" />
          </div>
          <div className="md:col-span-2 mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input name="shiftAuthorization" type="checkbox" className="mt-1 h-5 w-5 rounded border-input text-primary focus:ring-primary/20" />
              <span className="text-sm text-foreground/80">
                I authorize Sunshine Eldercare personnel to shift the member to a hospital recommended by Sunshine Eldercare or chosen by the member in case of an emergency.
              </span>
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loading ? 'Creating Account...' : 'Submit Registration'}
      </button>

      <div className="mt-2 text-center text-sm text-foreground/70">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
