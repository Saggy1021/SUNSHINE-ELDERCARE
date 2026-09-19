"use client"

import { useState, useMemo } from "react"
import { submitRenewalRequest } from "@/app/actions/membership"
import { calculateEndDate } from "@/lib/services/dates"

export default function RenewalWorkflow({ plans, addOns }: { plans: any[], addOns: any[] }) {
  const [step, setStep] = useState(1)
  const [carePlanId, setCarePlanId] = useState<string>("")
  const [variantType, setVariantType] = useState<string>("SINGLE")
  const [durationMonths, setDurationMonths] = useState<number>(1)
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([])
  
  // Start date defaults to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [startDateStr, setStartDateStr] = useState<string>(tomorrow.toISOString().split('T')[0])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const selectedPlan = plans.find(p => p.id === carePlanId)
  const selectedVariant = selectedPlan?.variants.find((v: any) => v.variantType === variantType)
  const selectedDuration = selectedVariant?.durations.find((d: any) => d.months === durationMonths)

  const startDate = new Date(startDateStr + 'T00:00:00Z')
  const endDate = calculateEndDate(startDate, durationMonths)

  const handleNext = () => setStep(s => s + 1)
  const handleBack = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("carePlanId", carePlanId)
      formData.append("variantType", variantType)
      formData.append("durationMonths", durationMonths.toString())
      formData.append("requestedStartDate", startDate.toISOString())
      
      selectedAddOnIds.forEach(id => formData.append("addOns", id))
      
      await submitRenewalRequest(formData)
      // Redirect happens in the action
    } catch (e) {
      console.error(e)
      alert("There was an error submitting your request. Please try again.")
      setIsSubmitting(false)
    }
  }

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  if (step === 1) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 1: Choose Package</h2>
        <div className="grid gap-4">
          {plans.map(p => (
            <label key={p.id} className={`p-4 border rounded-lg cursor-pointer transition-colors ${carePlanId === p.id ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="plan" checked={carePlanId === p.id} onChange={() => setCarePlanId(p.id)} className="h-4 w-4 text-amber-600 focus:ring-amber-600" />
                <span className="font-semibold text-slate-900">{p.name}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button disabled={!carePlanId} onClick={handleNext} className="bg-amber-500 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors">Next</button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 2: Choose Variant</h2>
        <div className="grid gap-4">
          {["SINGLE", "COUPLE"].map(v => (
            <label key={v} className={`p-4 border rounded-lg cursor-pointer transition-colors ${variantType === v ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="variant" checked={variantType === v} onChange={() => setVariantType(v)} className="h-4 w-4 text-amber-600 focus:ring-amber-600" />
                <span className="font-semibold text-slate-900">{v}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <button onClick={handleBack} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md transition-colors">Back</button>
          <button onClick={handleNext} className="bg-amber-500 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-600 transition-colors">Next</button>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 3: Choose Duration</h2>
        <div className="grid gap-4">
          {[1, 3, 6, 12].map(d => (
            <label key={d} className={`p-4 border rounded-lg cursor-pointer transition-colors ${durationMonths === d ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="radio" name="duration" checked={durationMonths === d} onChange={() => setDurationMonths(d)} className="h-4 w-4 text-amber-600 focus:ring-amber-600" />
                  <span className="font-semibold text-slate-900">{d} Month{d > 1 ? 's' : ''}</span>
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <button onClick={handleBack} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md transition-colors">Back</button>
          <button onClick={handleNext} className="bg-amber-500 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-600 transition-colors">Next</button>
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 4: Select Add-ons</h2>
        <div className="grid gap-4">
          {addOns.map(a => (
            <label key={a.id} className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddOnIds.includes(a.id) ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedAddOnIds.includes(a.id)} onChange={() => toggleAddOn(a.id)} className="h-4 w-4 text-amber-600 focus:ring-amber-600 rounded" />
                  <span className="font-semibold text-slate-900">{a.name}</span>
                </div>
                <span className="text-sm font-medium text-emerald-600">₹{a.price}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <button onClick={handleBack} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md transition-colors">Back</button>
          <button onClick={handleNext} className="bg-amber-500 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-600 transition-colors">Next</button>
        </div>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 5: Select Start Date</h2>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-slate-700 mb-2">Requested Start Date</label>
          <input 
            type="date" 
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
            className="w-full border border-slate-300 rounded-md shadow-sm p-3 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>
        
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-sm text-slate-600">Based on your selected duration of {durationMonths} month(s), your calculated inclusive end date will be:</p>
          <p className="font-semibold text-slate-900 mt-2">{endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={handleBack} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md transition-colors">Back</button>
          <button onClick={handleNext} className="bg-amber-500 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-600 transition-colors">Review</button>
        </div>
      </div>
    )
  }

  // REVIEW STEP
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4">Renewal Review</h2>
      
      <div className="space-y-4 mb-8">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-600 font-medium">Package:</span>
          <span className="text-slate-900 font-semibold">{selectedPlan?.name}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-600 font-medium">Variant:</span>
          <span className="text-slate-900 font-semibold">{variantType}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-600 font-medium">Duration:</span>
          <span className="text-slate-900 font-semibold">{durationMonths} Months</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-600 font-medium">Start Date:</span>
          <span className="text-slate-900 font-semibold">{startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-600 font-medium">End Date:</span>
          <span className="text-slate-900 font-semibold">{endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
        
        {selectedAddOnIds.length > 0 && (
          <div className="border-b border-slate-100 pb-2">
            <span className="text-slate-600 font-medium block mb-2">Add-ons:</span>
            <ul className="pl-4">
              {selectedAddOnIds.map(id => {
                const a = addOns.find(x => x.id === id)
                return <li key={id} className="text-slate-900 text-sm font-semibold mb-1 flex justify-between">
                  <span>{a?.name}</span>
                  <span>₹{a?.price}</span>
                </li>
              })}
            </ul>
          </div>
        )}
        
        <div className="pt-4 flex justify-between items-center text-lg">
          <span className="font-bold text-slate-900">Package Base Price</span>
          <span className="font-bold text-slate-900">
            {selectedDuration ? `₹${selectedDuration.documentedTotal.toLocaleString('en-IN')}` : '---'}
          </span>
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
        <p className="text-amber-800 text-sm font-medium">Payment step is currently deferred. Clicking below will submit your renewal request.</p>
      </div>

      <div className="flex justify-between">
        <button onClick={handleBack} disabled={isSubmitting} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50">Back</button>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !selectedDuration} 
          className="bg-emerald-600 text-white px-8 py-3 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Renewal Request'}
        </button>
      </div>
    </div>
  )
}
