'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export function AdminOnboardingForm({ plans, addOns }: { plans: any[], addOns: any[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCustomPrice, setIsCustomPrice] = useState(false)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Group member fields into a JSON string
    const memberData = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      idProofType: formData.get('idProofType'),
      idProofNumber: formData.get('idProofNumber'),
      dateOfBirth: formData.get('dateOfBirth'),
      gender: formData.get('gender'),
      serviceAddress: formData.get('serviceAddress'),
      nearestLandmark: formData.get('nearestLandmark'),
      mobileNumber: formData.get('mobileNumber'),
      alternateNumber: formData.get('alternateNumber'),
      emergencyContactName: formData.get('emergencyContactName'),
      emergencyContactRelationship: formData.get('emergencyContactRelationship'),
      emergencyContactMobile: formData.get('emergencyContactMobile'),
      emergencyContactOther: formData.get('emergencyContactOther'),
      emergencyContactEmail: formData.get('emergencyContactEmail'),
      sponsorName: formData.get('sponsorName'),
      sponsorRelationship: formData.get('sponsorRelationship'),
      sponsorMobile: formData.get('sponsorMobile'),
      sponsorOther: formData.get('sponsorOther'),
      sponsorEmail: formData.get('sponsorEmail'),
    }

    const submissionData = new FormData()
    submissionData.append('memberData', JSON.stringify(memberData))
    submissionData.append('planId', formData.get('planId') as string)
    submissionData.append('addOnIds', JSON.stringify(selectedAddOns))
    if (isCustomPrice) {
      submissionData.append('customPrice', formData.get('customPrice') as string)
      submissionData.append('customPriceReason', formData.get('customPriceReason') as string)
    }
    submissionData.append('paymentMethod', formData.get('paymentMethod') as string)
    submissionData.append('paymentReference', formData.get('paymentReference') as string)

    try {
      const { adminOnboardMember } = await import('@/app/actions/admin-onboarding')
      const result = await adminOnboardMember(submissionData)

      if (result.success) {
        router.push(`/admin/members/${result.userId}`)
      } else {
        setError(result.error || 'Registration failed')
        window.scrollTo(0, 0)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      window.scrollTo(0, 0)
    } finally {
      setLoading(false)
    }
  }

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      {error && (
        <div className="rounded-md bg-red-500/10 p-4 text-sm font-medium text-red-600 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Account Info */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2 text-slate-800">Account Login</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email Address *</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Password *</label>
            <input name="password" type="password" required minLength={8} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* MEMBER DETAILS */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2 text-slate-800">Member Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">First Name *</label>
            <input name="firstName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Surname / Last Name *</label>
            <input name="lastName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Date of Birth *</label>
            <input name="dateOfBirth" type="date" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Gender *</label>
            <select name="gender" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Primary Mobile *</label>
            <input name="mobileNumber" type="tel" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Alternate Number</label>
            <input name="alternateNumber" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Service Address *</label>
            <textarea name="serviceAddress" required rows={2} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* PLAN & PRICING */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-xl border-b border-slate-200 pb-2 text-slate-800">Plan & Pricing Setup</h3>
        
        <div className="space-y-6 pt-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Base Plan *</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map(plan => (
                <label key={plan.id} className="cursor-pointer">
                  <input type="radio" name="planId" value={plan.id} className="peer sr-only" required />
                  <div className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:ring-1 peer-checked:ring-blue-500 transition-all">
                    <div className="font-medium text-slate-900">{plan.name}</div>
                    <div className="text-sm text-slate-500 mt-1">₹{plan.price.toLocaleString('en-IN')}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Add-ons</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {addOns.map(addon => (
                <label key={addon.id} className="cursor-pointer relative">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={selectedAddOns.includes(addon.id)}
                    onChange={() => toggleAddOn(addon.id)}
                  />
                  <div className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:ring-1 peer-checked:ring-blue-500 transition-all h-full">
                    <div className="font-medium text-slate-900">{addon.name}</div>
                    <div className="text-sm text-slate-500 mt-1">₹{addon.price.toLocaleString('en-IN')}</div>
                    {selectedAddOns.includes(addon.id) && (
                      <Check className="absolute top-4 right-4 h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isCustomPrice}
                onChange={(e) => setIsCustomPrice(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Apply Custom / Negotiated Price (Requires Permission)</span>
            </label>

            {isCustomPrice && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom Price (₹) *</label>
                  <input name="customPrice" type="number" min="0" required={isCustomPrice} className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason / Authorization Ref *</label>
                  <input name="customPriceReason" type="text" required={isCustomPrice} placeholder="e.g. Approved by Director" className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="md:col-span-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Note: Custom pricing overrides the plan base price but applies the same tax calculations. Add-ons are ignored when a custom price is set.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PAYMENT DETAILS */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl border-b border-border pb-2 text-slate-800">Initial Payment Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Payment Method *</label>
            <select name="paymentMethod" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="">Select Method</option>
              <option value="ONLINE_PENDING">Send Payment Link (Online)</option>
              <option value="OFFLINE">Offline (Bank Transfer/Cheque/Cash)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Reference / Cheque No (If Offline)</label>
            <input name="paymentReference" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          The system will generate an immutable invoice automatically. Offline payments will be recorded as "Verification Pending" until an administrator verifies the receipt of funds.
        </p>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? 'Processing Onboarding...' : 'Complete Registration & Billing'}
        </button>
      </div>
    </form>
  )
}
