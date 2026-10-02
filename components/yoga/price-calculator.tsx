'use client'

import { useState, useEffect } from 'react'
import { getCarePlanPrice } from '@/app/actions/care-plans'
import type { CarePlanCatalogEntry, CarePlanLookupResult } from '@/lib/services/care-plans'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'

import { useRouter } from 'next/navigation'

interface PriceCalculatorProps {
  plan: CarePlanCatalogEntry
  isAuthenticated?: boolean
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export function PriceCalculator({ plan, isAuthenticated }: PriceCalculatorProps) {
  const router = useRouter()
  const [variantType, setVariantType] = useState<'SINGLE' | 'COUPLE'>('SINGLE')
  const [months, setMonths] = useState<number>(1)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [result, setResult] = useState<CarePlanLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Idempotency key to strictly prevent duplicate invoice creation on rapid double-clicks
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')

  useEffect(() => {
    // Generate a new key whenever the commercial configuration changes
    setIdempotencyKey(crypto.randomUUID())
  }, [variantType, months, plan.slug])

  const selectedVariant = plan.variants.find((v) => v.variantType === variantType)
  const availableDurations = selectedVariant?.durations.map((d) => d.months) ?? [1]

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.set('planSlug', plan.slug)
    formData.set('variantType', variantType)
    formData.set('months', String(months))
    selectedAddOns.forEach(id => formData.append('addOns', id))

    const response = await getCarePlanPrice(formData)

    if (response.success && response.data) {
      setResult(response.data)
    } else {
      setError(response.error ?? 'Unable to retrieve pricing.')
    }
    setLoading(false)
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) return

    // Phase 7 explicitly prohibits creating an invoice from the public page.
    // The authenticated user is routed to the future checkout/dashboard flow.
    router.push('/dashboard')
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-8 shadow-lg">
      <h2 className="font-display text-xl font-bold text-foreground">Price Calculator</h2>
      <p className="mt-1 text-sm text-foreground/60">Select your options to view the exact documented price.</p>

      <div className="mt-6 space-y-5">
        {/* Variant Selection */}
        <div>
          <label className="block text-sm font-semibold text-foreground/80 mb-2">Plan Type</label>
          <div className="flex gap-3">
            {(['SINGLE', 'COUPLE'] as const).map((v) => {
              const available = plan.variants.some((pv) => pv.variantType === v)
              return (
                <button
                  key={v}
                  disabled={!available}
                  onClick={() => {
                    setVariantType(v)
                    setResult(null)
                  }}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    variantType === v
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border text-foreground/60 hover:border-gold/50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {v === 'SINGLE' ? 'Single' : 'Couple'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-semibold text-foreground/80 mb-2">Duration</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {availableDurations.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMonths(m)
                  setResult(null)
                }}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  months === m
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border text-foreground/60 hover:border-gold/50'
                }`}
              >
                {m === 1 ? '1 Month' : `${m} Months`}
              </button>
            ))}
          </div>
        </div>

        {/* Add-Ons */}
        <div>
          <label className="block text-sm font-semibold text-foreground/80 mb-2">Optional Add-Ons (Placeholder)</label>
          <div className="space-y-3">
            {[
              { id: 'doctor_consultation', name: 'Doctor Consultation', price: 0 },
              { id: 'wellness_support', name: 'Wellness Support', price: 0 },
            ].map(addon => (
              <label key={addon.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-colors ${selectedAddOns.includes(addon.id) ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50'}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="accent-gold h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold" checked={selectedAddOns.includes(addon.id)} onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAddOns([...selectedAddOns, addon.id])
                    } else {
                      setSelectedAddOns(selectedAddOns.filter(id => id !== addon.id))
                    }
                    setResult(null)
                  }} />
                  <span className="text-sm font-medium text-foreground">{addon.name}</span>
                </div>
                <span className="text-sm font-semibold text-gold">₹{addon.price}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-brown transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Calculating…' : 'Show Exact Price'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold font-semibold">
                {result.planName} — {result.variantType === 'SINGLE' ? 'Single' : 'Couple'}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                {result.months === 1 ? '1 Month' : `${result.months} Months`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-foreground">
                {formatINR(result.documentedTotal)}
              </p>
              {result.hasDiscount && result.discountNote && (
                <p className="mt-1 text-xs text-gold font-medium">{result.discountNote}</p>
              )}
            </div>
          </div>
          
          {selectedAddOns.length > 0 && (
            <div className="mt-4 border-t border-gold/20 pt-4 flex justify-between items-center text-sm">
              <span className="text-foreground/70">Add-Ons Total</span>
              <span className="font-semibold text-gold">₹0</span>
            </div>
          )}

          {result.months === 1 && (
            <div className="mt-4 border-t border-gold/20 pt-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-foreground/50 text-xs">Base Price</p>
                <p className="font-semibold text-foreground">{formatINR(result.monthlyBasePrice)}</p>
              </div>
              <div>
                <p className="text-foreground/50 text-xs">Inclusive of all applicable taxes/charges</p>
                <p className="font-semibold text-foreground">{formatINR(result.monthlyGst)}</p>
              </div>
              <div>
                <p className="text-foreground/50 text-xs">Total</p>
                <p className="font-semibold text-foreground">{formatINR(result.monthlyTotal)}</p>
              </div>
            </div>
          )}

          <ul className="mt-4 space-y-2 border-t border-gold/20 pt-4">
            {result.services.map((svc) => (
              <li key={svc.serviceName} className="flex items-start gap-2 text-sm text-foreground/80">
                <CheckCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>
                  {svc.serviceName}
                  {svc.serviceNote && (
                    <span className="ml-1 text-xs text-foreground/50">({svc.serviceNote})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {isAuthenticated ? (
            <button
              onClick={handleSubscribe}
              disabled={isSubmitting}
              className="mt-6 block w-full rounded-xl bg-gold px-6 py-3 text-center text-sm font-semibold text-brown transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating Invoice...' : 'Subscribe Now'}
            </button>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/membership/${plan.slug}`)}`}
              className="mt-6 block w-full rounded-xl bg-gold px-6 py-3 text-center text-sm font-semibold text-brown transition-opacity hover:opacity-90"
            >
              Subscribe Now
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
