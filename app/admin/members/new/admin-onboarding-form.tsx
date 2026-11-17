'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle, CalendarDays } from 'lucide-react'

function calculateClientEndDate(startDateStr: string, durationMonths: number): string {
  if (!startDateStr) return ""
  const parts = startDateStr.split("-").map(Number)
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return ""

  const year = parts[0]
  const month = parts[1] - 1 // 0-indexed
  const day = parts[2]

  const totalMonths = month + durationMonths
  const targetYear = year + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12

  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, daysInTargetMonth)

  const d = new Date(Date.UTC(targetYear, targetMonth, targetDay))
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AdminOnboardingForm({ plans, addOns }: { plans: any[], addOns: any[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [partialSuccess, setPartialSuccess] = useState<{ userId: string; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCustomPrice, setIsCustomPrice] = useState(false)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [showSpouseSection, setShowSpouseSection] = useState(false)
  const [hadSpouseData, setHadSpouseData] = useState(false)
  const [primaryFileError, setPrimaryFileError] = useState<string | null>(null)
  const [spouseFileError, setSpouseFileError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentFileError, setPaymentFileError] = useState<string | null>(null)
  const [startDateStr, setStartDateStr] = useState<string>(() => new Date().toISOString().split('T')[0])

  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const isCouplePlan = selectedPlan?.variantType === 'COUPLE'
  const shouldShowSpouse = isCouplePlan || showSpouseSection

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (primaryFileError || spouseFileError || paymentFileError) {
      setError("Please fix document upload errors before submitting.")
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Group member fields into a JSON string
    const memberData = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      idProofType: formData.get('idProofType') || undefined,
      idProofNumber: formData.get('idProofNumber') || undefined,
      dateOfBirth: formData.get('dateOfBirth'),
      gender: formData.get('gender'),
      serviceAddress: formData.get('serviceAddress'),
      nearestLandmark: formData.get('nearestLandmark') || undefined,
      mobileNumber: formData.get('mobileNumber'),
      alternateNumber: formData.get('alternateNumber') || undefined,

      // Spouse / Second Member Details
      spouseFirstName: formData.get('spouseFirstName') || undefined,
      spouseLastName: formData.get('spouseLastName') || undefined,
      spouseDateOfBirth: formData.get('spouseDateOfBirth') || undefined,
      spouseGender: formData.get('spouseGender') || undefined,
      spouseMobileNumber: formData.get('spouseMobileNumber') || undefined,
      spouseIdProofType: formData.get('spouseIdProofType') || undefined,
      spouseIdProofNumber: formData.get('spouseIdProofNumber') || undefined,

      emergencyContactName: formData.get('emergencyContactName'),
      emergencyContactRelationship: formData.get('emergencyContactRelationship'),
      emergencyContactMobile: formData.get('emergencyContactMobile'),
      emergencyContactOther: formData.get('emergencyContactOther') || undefined,
      emergencyContactEmail: formData.get('emergencyContactEmail') || undefined,
      sponsorName: formData.get('sponsorName'),
      sponsorRelationship: formData.get('sponsorRelationship'),
      sponsorMobile: formData.get('sponsorMobile'),
      sponsorOther: formData.get('sponsorOther') || undefined,
      sponsorEmail: formData.get('sponsorEmail') || undefined,
      insuranceProvider: formData.get('insuranceProvider') || undefined,
      policyNumber: formData.get('policyNumber') || undefined,
      coverageAmount: formData.get('coverageAmount') || undefined,
      hospitalForSos: formData.get('hospitalForSos') || undefined,
      nomineeLocalContact: formData.get('nomineeLocalContact') || undefined,
      shiftAuthorization: formData.get('shiftAuthorization') === 'on',
      medicalConditions: formData.get('medicalConditions') || undefined,
      bloodGroup: formData.get('bloodGroup') || undefined,
    }

    const submissionData = new FormData()
    submissionData.append('memberData', JSON.stringify(memberData))
    submissionData.append('planId', formData.get('planId') as string)
    submissionData.append('membershipStartDate', startDateStr)
    submissionData.append('addOnIds', JSON.stringify(selectedAddOns))
    if (isCustomPrice) {
      submissionData.append('customPrice', formData.get('customPrice') as string)
      submissionData.append('customPriceReason', formData.get('customPriceReason') as string)
    }
    submissionData.append('paymentMethod', formData.get('paymentMethod') as string)
    submissionData.append('paymentReference', formData.get('paymentReference') as string)

    const idProofFile = formData.get('idProofFile') as File | null
    if (idProofFile && idProofFile.size > 0) {
      submissionData.append('idProofFile', idProofFile)
    }
    const spouseIdProofFile = formData.get('spouseIdProofFile') as File | null
    if (spouseIdProofFile && spouseIdProofFile.size > 0) {
      submissionData.append('spouseIdProofFile', spouseIdProofFile)
    }
    const paymentDocumentFile = formData.get('paymentDocument') as File | null
    if (paymentDocumentFile && paymentDocumentFile.size > 0) {
      submissionData.append('paymentDocument', paymentDocumentFile)
    }

    try {
      const { adminOnboardMember } = await import('@/app/actions/admin-onboarding')
      const result = await adminOnboardMember(submissionData)

      if (result.success) {
        router.push(`/admin/members/${result.userId}`)
      } else if (result.userId) {
        setPartialSuccess({
          userId: result.userId,
          message: result.error || 'Member profile was created, but billing initialization failed.',
        })
        setError(null)
        window.scrollTo(0, 0)
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
      {partialSuccess && (
        <div className="rounded-xl bg-amber-500/10 p-5 text-sm border border-amber-500/30 text-amber-900 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 text-base">Member Profile Created — Billing Action Required</h4>
              <p className="mt-1 text-amber-800 leading-relaxed">{partialSuccess.message}</p>
              <p className="mt-2 text-xs text-amber-700">
                The member account has been registered in the database. Further submission from this form is disabled to prevent duplicate accounts.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href={`/admin/members/${partialSuccess.userId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
            >
              View Member Profile &amp; Setup Billing &rarr;
            </Link>
          </div>
        </div>
      )}

      {error && !partialSuccess && (
        <div className="rounded-md bg-red-500/10 p-4 text-sm font-medium text-red-600 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Member Portal Login Credentials */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-serif text-xl text-slate-800">Member Portal Login Credentials</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create the login credentials the member will use to access their Sunshine Eldercare Member Portal. These are not administrator credentials.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Member Email Address *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="e.g. member@example.com"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Initial Password *</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
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
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Nearest Landmark</label>
            <input name="nearestLandmark" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Service Address *</label>
            <textarea name="serviceAddress" required rows={2} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* IDENTITY PROOF */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-xl border-b border-slate-200 pb-2 text-slate-800">Identity Proof</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">ID Proof Type</label>
            <select name="idProofType" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="">Select ID Type</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Passport">Passport</option>
              <option value="PAN">PAN</option>
              <option value="Driving Licence">Driving Licence</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">ID Proof Number</label>
            <input name="idProofNumber" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">ID Proof Document (Optional)</label>
            <input
              name="idProofFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    setPrimaryFileError("File exceeds 2MB limit");
                  } else {
                    setPrimaryFileError(null);
                  }
                } else {
                  setPrimaryFileError(null);
                }
              }}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#091329] file:text-white hover:file:bg-[#162850] file:cursor-pointer"
            />
            {primaryFileError ? (
              <p className="text-xs text-red-600 mt-1">{primaryFileError}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Upload primary member's ID document (PDF, JPEG, PNG, max 2MB)</p>
            )}
          </div>
        </div>
      </div>

      {/* SPOUSE / SECOND MEMBER DETAILS */}
      <div className={`space-y-4 rounded-xl border transition-all ${
        shouldShowSpouse 
          ? 'bg-amber-50/40 p-6 border-amber-200/80 shadow-xs' 
          : 'bg-slate-50 p-5 border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl text-slate-800">Spouse / Second Member Details</h3>
              {isCouplePlan && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#091329] text-white uppercase tracking-wider">
                  Couple Plan Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isCouplePlan 
                ? 'Information for the second member covered under the Couple Care Plan. All fields are optional.' 
                : 'Optional for Single plans. Appears automatically when a Couple plan is selected.'}
            </p>
          </div>
          {!isCouplePlan && (
            <button
              type="button"
              onClick={() => setShowSpouseSection(!showSpouseSection)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shrink-0 self-start sm:self-center shadow-2xs"
            >
              {showSpouseSection ? 'Collapse Spouse Details' : 'Add Spouse Details (Optional)'}
            </button>
          )}
        </div>

        {/* Informational banner if switched from Couple to Single but data was entered */}
        {!isCouplePlan && hadSpouseData && (
          <div className="text-xs text-amber-800 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200/80 flex items-center justify-between">
            <span>Single plan selected. Previously entered spouse information is safely preserved in the form.</span>
            {!showSpouseSection && (
              <button
                type="button"
                onClick={() => setShowSpouseSection(true)}
                className="underline font-semibold ml-2 hover:text-amber-950"
              >
                View / Edit
              </button>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 ${shouldShowSpouse ? '' : 'hidden'}`}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse First Name</label>
            <input
              name="spouseFirstName"
              type="text"
              onChange={(e) => { if (e.target.value) setHadSpouseData(true) }}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse Surname / Last Name</label>
            <input
              name="spouseLastName"
              type="text"
              onChange={(e) => { if (e.target.value) setHadSpouseData(true) }}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse Date of Birth</label>
            <input
              name="spouseDateOfBirth"
              type="date"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse Gender</label>
            <select
              name="spouseGender"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Gender (Optional)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse Mobile Number</label>
            <input
              name="spouseMobileNumber"
              type="tel"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse ID Proof Type</label>
            <select
              name="spouseIdProofType"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select ID Type (Optional)</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Passport">Passport</option>
              <option value="PAN">PAN</option>
              <option value="Driving Licence">Driving Licence</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse ID Proof Number</label>
            <input
              name="spouseIdProofNumber"
              type="text"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Spouse ID Proof Document</label>
            <input
              name="spouseIdProofFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    setSpouseFileError("File exceeds 2MB limit");
                  } else {
                    setSpouseFileError(null);
                    setHadSpouseData(true);
                  }
                } else {
                  setSpouseFileError(null);
                }
              }}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#091329] file:text-white hover:file:bg-[#162850] file:cursor-pointer"
            />
            {spouseFileError ? (
              <p className="text-xs text-red-600 mt-1">{spouseFileError}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Accepted: PDF, JPEG, PNG (Max 2MB)</p>
            )}
          </div>
        </div>
      </div>

      {/* EMERGENCY CONTACT */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-xl border-b border-slate-200 pb-2 text-slate-800">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Name *</label>
            <input name="emergencyContactName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Relationship *</label>
            <input name="emergencyContactRelationship" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Primary Mobile *</label>
            <input name="emergencyContactMobile" type="tel" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Alternate Mobile</label>
            <input name="emergencyContactOther" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email</label>
            <input name="emergencyContactEmail" type="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* SPONSOR DETAILS */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-xl border-b border-slate-200 pb-2 text-slate-800">Sponsor Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Sponsor Name *</label>
            <input name="sponsorName" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Relationship *</label>
            <input name="sponsorRelationship" type="text" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Sponsor Mobile *</label>
            <input name="sponsorMobile" type="tel" required className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Alternate Mobile</label>
            <input name="sponsorOther" type="tel" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Sponsor Email</label>
            <input name="sponsorEmail" type="email" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* HEALTH INSURANCE */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-xl border-b border-slate-200 pb-2 text-slate-800">Health Insurance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Provider Name</label>
            <input name="insuranceProvider" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Policy Number</label>
            <input name="policyNumber" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Coverage Amount</label>
            <input name="coverageAmount" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      </div>

      {/* MEDICAL ALERT & SOS */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-xl border-b border-slate-200 pb-2 text-slate-800">Medical Alert & SOS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Preferred Hospital for SOS</label>
            <input name="hospitalForSos" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Local Nominee Contact</label>
            <input name="nomineeLocalContact" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Medical Conditions (Optional)</label>
            <textarea name="medicalConditions" rows={2} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Blood Group</label>
            <input name="bloodGroup" type="text" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="md:col-span-2 pt-2 flex items-center gap-3">
            <input type="checkbox" name="shiftAuthorization" id="shiftAuthorization" className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="shiftAuthorization" className="text-sm font-medium text-slate-700">Authorize shifting to hospital during emergencies</label>
          </div>
        </div>
      </div>

      {/* PLAN & PRICING */}
      <div className="space-y-4 bg-slate-50/70 p-6 rounded-xl border border-slate-200">
        <h3 className="font-serif text-lg font-bold border-b border-slate-200 pb-2 text-[#091329]">Plan & Pricing Setup</h3>
        
        <div className="space-y-6 pt-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Base Plan *</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map(plan => (
                <label key={plan.id} className="cursor-pointer relative block">
                  <input
                    type="radio"
                    name="planId"
                    value={plan.id}
                    className="peer sr-only"
                    required
                    checked={selectedPlanId === plan.id}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  />
                  <div className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 peer-checked:border-[#091329] peer-checked:ring-2 peer-checked:ring-[#091329]/20 peer-checked:shadow-xs transition-all">
                    <div className="font-medium text-slate-900 text-sm">{plan.name}</div>
                    <div className="text-sm font-semibold text-[#091329] mt-1.5">₹{plan.price.toLocaleString('en-IN')}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* MEMBERSHIP DATES & DURATION */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <CalendarDays className="h-4 w-4 text-[#091329]" />
              <h4 className="text-sm font-semibold text-slate-900">Membership Dates & Duration</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Joined / Start Date *
                </label>
                <input
                  type="date"
                  name="membershipStartDate"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Membership Duration
                </label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700">
                  {selectedPlan ? `${selectedPlan.months} Month${selectedPlan.months > 1 ? 's' : ''}` : 'Select a plan'}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Calculated End Date
                </label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-[#091329] flex items-center justify-between">
                  <span>{calculateClientEndDate(startDateStr, selectedPlan?.months || 1) || '—'}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">Auto</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Add-ons</label>
            {addOns.length === 0 ? (
              <div className="text-sm text-slate-500 bg-white p-3.5 rounded-lg border border-slate-200">
                No active add-ons are currently available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {addOns.map(addon => (
                  <label key={addon.id} className="cursor-pointer relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selectedAddOns.includes(addon.id)}
                      onChange={() => toggleAddOn(addon.id)}
                    />
                    <div className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 peer-checked:border-[#091329] peer-checked:ring-2 peer-checked:ring-[#091329]/20 transition-all h-full">
                      <div className="font-medium text-slate-900 text-sm">{addon.name}</div>
                      <div className="text-sm font-semibold text-[#091329] mt-1">₹{addon.price.toLocaleString('en-IN')}</div>
                      {selectedAddOns.includes(addon.id) && (
                        <Check className="absolute top-4 right-4 h-4 w-4 text-[#B08A4A]" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isCustomPrice}
                onChange={(e) => setIsCustomPrice(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#091329] focus:ring-[#091329]"
              />
              <span className="text-sm font-medium text-slate-700">Apply Custom / Negotiated Price (Requires Permission)</span>
            </label>

            {isCustomPrice && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom Price (₹) *</label>
                  <input name="customPrice" type="number" min="0" required={isCustomPrice} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason / Authorization Ref *</label>
                  <input name="customPriceReason" type="text" required={isCustomPrice} placeholder="e.g. Approved by Director" className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329]" />
                </div>
                <div className="md:col-span-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200/60">
                  Note: Custom pricing overrides the plan base price but applies the same tax calculations. Add-ons are ignored when a custom price is set.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PAYMENT DETAILS */}
      <div className="space-y-4">
        <h3 className="font-serif text-lg font-bold border-b border-slate-200 pb-2 text-[#091329]">Initial Payment Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Payment Method *</label>
            <select
              name="paymentMethod"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329]"
            >
              <option value="">Select Method</option>
              <option value="ONLINE_PENDING">Send Payment Link (Online)</option>
              <option value="OFFLINE">Offline (Bank Transfer/Cheque/Cash)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Reference / Cheque No (If Offline)</label>
            <input name="paymentReference" type="text" className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329]" />
          </div>
          {paymentMethod === 'OFFLINE' && (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                Offline Payment Receipt / Cheque Proof (Optional)
              </label>
              <input
                name="paymentDocument"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      setPaymentFileError("Payment receipt exceeds 10MB limit");
                    } else {
                      setPaymentFileError(null);
                    }
                  } else {
                    setPaymentFileError(null);
                  }
                }}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#091329] file:text-white hover:file:bg-[#162850] file:cursor-pointer"
              />
              {paymentFileError ? (
                <p className="text-xs text-red-600 mt-1">{paymentFileError}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">Accepted: PDF, JPEG, PNG (Max 10MB)</p>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          The system will generate an immutable invoice automatically. Offline payments will be recorded as "Verification Pending" until an administrator verifies the receipt of funds.
        </p>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading || !!partialSuccess || !!primaryFileError || !!spouseFileError || !!paymentFileError}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Processing Onboarding...' : 'Complete Registration & Billing'}
        </button>
      </div>
    </form>
  )
}




