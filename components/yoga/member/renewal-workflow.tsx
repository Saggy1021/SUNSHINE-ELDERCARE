"use client"

import { useState, useMemo } from "react"
import { submitRenewalRequest } from "@/app/actions/membership"
import { calculateEndDate } from "@/lib/services/dates"
import { CheckCircle2 } from "lucide-react"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export default function RenewalWorkflow({ plans, addOns, isNew = false }: { plans: any[], addOns: any[], isNew?: boolean }) {
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
    } catch (e: any) {
      if (isRedirectError(e)) {
        throw e
      }
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
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-slate-900 border-b pb-4">Choose Your Plan</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(p => {
            const singleVariant = p.variants.find((v: any) => v.variantType === 'SINGLE')
            const allPrices = p.variants.flatMap((v: any) => v.durations.map((d: any) => d.documentedTotal))
            const startingPrice = Math.min(...allPrices)
            const isSelected = carePlanId === p.id

            return (
              <div key={p.id} className={`border rounded-xl overflow-hidden transition-all duration-200 flex flex-col ${isSelected ? 'border-amber-500 ring-1 ring-amber-500 shadow-md' : 'border-slate-200 hover:border-amber-300 hover:shadow-sm'}`}>
                {/* Card Header / Summary */}
                <div className="p-6 flex-grow flex flex-col cursor-pointer" onClick={() => {
                  if (!isSelected) {
                    setCarePlanId(p.id)
                    setVariantType("SINGLE") // Default
                    setDurationMonths(p.variants.find((v:any) => v.variantType === 'SINGLE')?.durations[0]?.months || 1) // Default
                  }
                }}>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{p.name}</h3>
                  {singleVariant && singleVariant.services.length > 0 && (
                    <ul className="mb-6 space-y-2 flex-grow">
                      {singleVariant.services.slice(0, 4).map((s: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{s.serviceName}</span>
                        </li>
                      ))}
                      {singleVariant.services.length > 4 && (
                        <li className="text-xs text-slate-500 font-medium pt-1">+ {singleVariant.services.length - 4} more features</li>
                      )}
                    </ul>
                  )}
                  
                  {!isSelected && (
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Starting From</p>
                        <p className="text-lg font-bold text-slate-900">₹{startingPrice.toLocaleString('en-IN')}</p>
                      </div>
                      <button className="text-amber-600 font-semibold text-sm hover:text-amber-700">View Pricing →</button>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="bg-amber-50/50 p-6 border-t border-amber-100">
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Variant</label>
                      <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden p-1">
                        {p.variants.map((v: any) => (
                          <button
                            key={v.variantType}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setVariantType(v.variantType); 
                              // Reset duration to a valid one for this variant if needed
                              const validDurations = v.durations.map((d:any)=>d.months);
                              if (!validDurations.includes(durationMonths)) {
                                setDurationMonths(validDurations[0] || 1);
                              }
                            }}
                            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${variantType === v.variantType ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {v.variantType}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">Duration</label>
                      <div className="space-y-2">
                        {p.variants.find((v:any) => v.variantType === variantType)?.durations.map((d: any) => (
                          <label key={d.months} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors bg-white ${durationMonths === d.months ? 'border-amber-500 shadow-sm ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-300'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name={`duration-${p.id}`} 
                                checked={durationMonths === d.months} 
                                onChange={() => setDurationMonths(d.months)} 
                                className="h-4 w-4 text-amber-600 focus:ring-amber-600" 
                              />
                              <span className="font-semibold text-slate-900">{d.months} Month{d.months > 1 ? 's' : ''}</span>
                            </div>
                            <span className="font-bold text-slate-900">₹{d.documentedTotal.toLocaleString('en-IN')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleNext() }} 
                      disabled={!durationMonths}
                      className="w-full mt-6 bg-amber-500 text-white py-3 rounded-lg font-bold shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 2: Select Add-ons</h2>
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

  if (step === 3) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Step 3: Select Start Date</h2>
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
      <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4">{isNew ? "Purchase Review" : "Renewal Review"}</h2>
      
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
          <span className="font-semibold text-slate-900">Package Price</span>
          <span className="font-semibold text-slate-900">
            {selectedDuration ? `₹${selectedDuration.documentedTotal.toLocaleString('en-IN')}` : '---'}
          </span>
        </div>
        
        {selectedAddOnIds.length > 0 && (
          <div className="pt-2 flex justify-between items-center text-lg">
            <span className="font-semibold text-slate-900">Add-ons Total</span>
            <span className="font-semibold text-slate-900">
              ₹{selectedAddOnIds.reduce((sum, id) => sum + (addOns.find(x => x.id === id)?.price || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center text-xl">
          <span className="font-bold text-slate-900">Estimated Total</span>
          <span className="font-bold text-emerald-700">
            {selectedDuration ? `₹${(selectedDuration.documentedTotal + selectedAddOnIds.reduce((sum, id) => sum + (addOns.find(a => a.id === id)?.price || 0), 0)).toLocaleString('en-IN')}` : '---'}
          </span>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={handleBack} disabled={isSubmitting} className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50">Back</button>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !selectedDuration} 
          className="bg-emerald-600 text-white px-8 py-3 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  )
}
