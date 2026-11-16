'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle, CalendarDays, Loader2, User, Users, Shield, Activity, HeartPulse, PhoneCall, Building2 } from 'lucide-react'
import { adminUpdateMember } from '@/app/actions/admin'

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function calculateClientEndDate(startDateStr: string, durationMonths: number): string {
  if (!startDateStr || !durationMonths) return ""
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
  return d.toISOString().split('T')[0];
}

export function MemberEditForm({ member, catalog }: { member: any; catalog?: any[] }) {
  const router = useRouter()
  const profile = member.memberProfile
  const currentSub = member.subscriptions?.[0]
  const emergency = member.emergencyContact
  const sponsor = profile?.sponsor
  const insurance = profile?.insuranceDetails
  const medicalAuth = profile?.medicalAuth

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Spouse toggle
  const initialHasSpouse = Boolean(
    profile?.spouseFirstName || profile?.spouseLastName || profile?.spouseMobileNumber
  )
  const [hasSpouse, setHasSpouse] = useState(initialHasSpouse)

  // Subscription dates
  const initialStartDate = formatDateForInput(currentSub?.startDate)
  const initialEndDate = formatDateForInput(currentSub?.endDate)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [durationMonths, setDurationMonths] = useState<number>(currentSub?.durationMonths || 6)

  // Name splitting fallback if firstName/lastName not explicit
  const defaultFirstName = profile?.firstName || member.name?.split(' ')[0] || ''
  const defaultLastName = profile?.lastName || member.name?.split(' ').slice(1).join(' ') || ''

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart)
    if (newStart && durationMonths) {
      const autoEnd = calculateClientEndDate(newStart, durationMonths)
      if (autoEnd) {
        setEndDate(autoEnd)
      }
    }
  }

  const handleDurationChange = (newMonths: number) => {
    setDurationMonths(newMonths)
    if (startDate && newMonths) {
      const autoEnd = calculateClientEndDate(startDate, newMonths)
      if (autoEnd) {
        setEndDate(autoEnd)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    // Explicitly pass boolean flag for spouse
    formData.set('hasSpouse', hasSpouse ? 'true' : 'false')

    try {
      const res = await adminUpdateMember(formData)
      if (!res.success) {
        setError(res.error || 'Failed to update member profile.')
        setLoading(false)
      } else {
        setSuccess('Member profile updated successfully. Redirecting...')
        setTimeout(() => {
          router.push(`/admin/members/${member.id}`)
          router.refresh()
        }, 800)
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <input type="hidden" name="userId" value={member.id} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 font-medium">{success}</p>
        </div>
      )}

      {/* SECTION 1: PRIMARY MEMBER DETAILS */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#091329]" />
            <h3 className="font-semibold text-lg text-slate-900">Primary Member Details</h3>
          </div>
          {profile?.memberId && (
            <span className="text-xs text-slate-500 font-mono">
              MID: <strong className="text-slate-900">{profile.memberId}</strong> (Protected)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              required
              defaultValue={defaultFirstName}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              required
              defaultValue={defaultLastName}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Primary Mobile No. *
            </label>
            <input
              type="tel"
              name="mobileNumber"
              required
              defaultValue={profile?.mobileNumber || ''}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              required
              defaultValue={member.email || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Alternate Phone No.
            </label>
            <input
              type="tel"
              name="alternateNumber"
              defaultValue={profile?.alternateNumber || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              defaultValue={formatDateForInput(profile?.dateOfBirth)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Gender
            </label>
            <select
              name="gender"
              defaultValue={profile?.gender || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              ID Proof Type
            </label>
            <select
              name="idProofType"
              defaultValue={profile?.idProofType || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            >
              <option value="">Select ID Type</option>
              <option value="Aadhaar">Aadhaar Card</option>
              <option value="PAN">PAN Card</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Passport">Passport</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              ID Proof Number
            </label>
            <input
              type="text"
              name="idProofNumber"
              defaultValue={profile?.idProofNumber || ''}
              placeholder="e.g. ABCD1234E"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Service Address
            </label>
            <input
              type="text"
              name="serviceAddress"
              defaultValue={profile?.serviceAddress || ''}
              placeholder="Full registered service address"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nearest Landmark
            </label>
            <input
              type="text"
              name="nearestLandmark"
              defaultValue={profile?.nearestLandmark || ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: SECONDARY MEMBER / SPOUSE DETAILS */}
      <div className="space-y-4 bg-slate-50/70 p-6 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-700" />
            <h3 className="font-semibold text-lg text-slate-900">Spouse / Secondary Member</h3>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hasSpouse}
              onChange={(e) => setHasSpouse(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#091329] focus:ring-[#091329]"
            />
            <span>Include Spouse / Secondary Member</span>
          </label>
        </div>

        {hasSpouse ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spouse First Name
                </label>
                <input
                  type="text"
                  name="spouseFirstName"
                  defaultValue={profile?.spouseFirstName || ''}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spouse Last Name
                </label>
                <input
                  type="text"
                  name="spouseLastName"
                  defaultValue={profile?.spouseLastName || ''}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Secondary Mobile No.
                </label>
                <input
                  type="tel"
                  name="spouseMobileNumber"
                  defaultValue={profile?.spouseMobileNumber || ''}
                  placeholder="Spouse 10-digit mobile number"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spouse Date of Birth
                </label>
                <input
                  type="date"
                  name="spouseDateOfBirth"
                  defaultValue={formatDateForInput(profile?.spouseDateOfBirth)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spouse Gender
                </label>
                <select
                  name="spouseGender"
                  defaultValue={profile?.spouseGender || ''}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spouse ID Proof Type
                </label>
                <select
                  name="spouseIdProofType"
                  defaultValue={profile?.spouseIdProofType || ''}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                >
                  <option value="">Select ID Type</option>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spouse ID Proof Number
                </label>
                <input
                  type="text"
                  name="spouseIdProofNumber"
                  defaultValue={profile?.spouseIdProofNumber || ''}
                  placeholder="e.g. ABCD1234E"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No secondary member linked. Check the box above to add spouse or secondary member details to this account.
          </p>
        )}
      </div>

      {/* SECTION 3: MEMBERSHIP DETAILS & DATES */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-700" />
          <h3 className="font-semibold text-lg text-slate-900">Membership Details & Dates</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Date of Enrollment (DOE)
            </label>
            <input
              type="date"
              name="dateOfEnrollment"
              defaultValue={formatDateForInput(profile?.dateOfEnrollment)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Official enrollment record</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Membership Duration
            </label>
            <select
              name="durationMonths"
              value={durationMonths}
              onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months (1 Year)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              From (Membership Start Date)
            </label>
            <input
              type="date"
              name="startDate"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              To (Membership End Date)
            </label>
            <input
              type="date"
              name="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>
        </div>

        {catalog && catalog.length > 0 && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Care Plan / Service
            </label>
            <select
              name="carePlanId"
              defaultValue={currentSub?.carePlanId || ''}
              className="w-full md:w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            >
              <option value="">Keep current plan ({currentSub?.carePlan?.name || currentSub?.customPlan?.name || 'Default'})</option>
              {catalog.map((cp: any) => (
                <option key={cp.id || cp.slug} value={cp.id || cp.slug}>
                  {cp.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SECTION 4: HEALTH, MEDICAL & EMERGENCY PROFILE */}
      <div className="space-y-4 bg-slate-50/70 p-6 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-rose-600" />
          <h3 className="font-semibold text-lg text-slate-900">Medical & Health Profile</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Blood Group
            </label>
            <select
              name="bloodGroup"
              defaultValue={profile?.bloodGroup || ''}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Hospital for SOS
            </label>
            <input
              type="text"
              name="hospitalForSos"
              defaultValue={medicalAuth?.hospitalForSos || ''}
              placeholder="e.g. Apollo Gleneagles Hospital"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                name="shiftAuthorization"
                value="true"
                defaultChecked={Boolean(medicalAuth?.shiftAuthorization)}
                className="h-4 w-4 rounded border-slate-300 text-[#091329] focus:ring-[#091329]"
              />
              <span>Shift Authorization for Emergency Care</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Medical Conditions & Alerts
          </label>
          <textarea
            name="medicalConditions"
            rows={2}
            defaultValue={profile?.medicalConditions || ''}
            placeholder="Document existing medical diagnoses, allergies, and special considerations"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
          />
        </div>
      </div>

      {/* SECTION 5: HEALTH INSURANCE */}
      <div className="space-y-4 bg-slate-50/70 p-6 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-lg text-slate-900">Health Insurance</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Insurance Provider
            </label>
            <input
              type="text"
              name="insuranceProvider"
              defaultValue={insurance?.providerName || ''}
              placeholder="e.g. Star Health, Niva Bupa"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Policy Number
            </label>
            <input
              type="text"
              name="policyNumber"
              defaultValue={insurance?.policyNumber || ''}
              placeholder="e.g. POL-98765432"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Coverage Amount
            </label>
            <input
              type="text"
              name="coverageAmount"
              defaultValue={insurance?.coverageAmount || ''}
              placeholder="e.g. ₹5,00,000"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 6: EMERGENCY CONTACT & SPONSOR */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-lg text-slate-900">Emergency Contact & Sponsor</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Emergency Contact */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800">Primary Emergency Contact</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                name="emergencyContactName"
                defaultValue={emergency?.fullName || ''}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Relationship</label>
                <input
                  type="text"
                  name="emergencyContactRelationship"
                  defaultValue={emergency?.relationship || ''}
                  placeholder="e.g. Son, Daughter"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  defaultValue={emergency?.phone || ''}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-mono outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                name="emergencyContactEmail"
                defaultValue={emergency?.email || ''}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none"
              />
            </div>
          </div>

          {/* Sponsor Details */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800">Sponsor Details</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sponsor Full Name</label>
              <input
                type="text"
                name="sponsorName"
                defaultValue={sponsor?.fullName || ''}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Relationship</label>
                <input
                  type="text"
                  name="sponsorRelationship"
                  defaultValue={sponsor?.relationship || ''}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  name="sponsorMobile"
                  defaultValue={sponsor?.mobileNumber || ''}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-mono outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                name="sponsorEmail"
                defaultValue={sponsor?.email || ''}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <Link
          href={`/admin/members/${member.id}`}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#091329] text-white text-sm font-semibold rounded-lg hover:bg-[#162850] shadow-sm disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
