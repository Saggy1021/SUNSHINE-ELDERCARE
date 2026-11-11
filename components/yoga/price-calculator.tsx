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
  addOns?: any[]
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export function PriceCalculator({ plan, isAuthenticated, addOns = [] }: PriceCalculatorProps) {
  const router = useRouter()
  const [variantType, setVariantType] = useState<'SINGLE' | 'COUPLE'>('SINGLE')
  const [months, setMonths] = useState<number>(1)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [result, setResult] = useState<CarePlanLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const getRenewUrl = () => {
    const params = new URLSearchParams()
    params.set('plan', plan.slug)
    params.set('variant', variantType)
    params.set('duration', String(months))
    if (selectedAddOns.length > 0) {
      params.set('addOns', selectedAddOns.join(','))
    }
    return `/dashboard/renew?${params.toString()}`
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) return
    router.push(getRenewUrl())
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 3, 6, 12].map((m) => {
              const available = availableDurations.includes(m)
              return (
                <button
                  key={m}
                  disabled={!available}
                  onClick={() => {
                    setMonths(m)
                    setResult(null)
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    months === m
                      ? 'border-gold bg-gold/10 text-gold font-semibold'
                      : 'border-border text-foreground/60 hover:border-gold/50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {m === 1 ? '1 Month' : `${m} Months`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Add-ons Selection */}
        {addOns.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-foreground/80 mb-2">Optional Add-ons</label>
            <div className="space-y-2">
              {addOns.map((addon) => {
                const isSelected = selectedAddOns.includes(addon.id)
                return (
                  <label
                    key={addon.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-gold bg-gold/5' : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddOns([...selectedAddOns, addon.id])
                          } else {
                            setSelectedAddOns(selectedAddOns.filter(id => id !== addon.id))
                          }
                          setResult(null)
                        }}
                        className="rounded border-border text-gold focus:ring-gold"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{addon.name}</p>
                        <p className="text-xs text-foreground/50">{addon.description}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gold">
                      +₹{Number(addon.price).toLocaleString('en-IN')}/mo
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate Exact Total'}
        </button>

        {error && (
          <p className="text-xs text-rose-500 text-center font-medium">{error}</p>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-6 space-y-4">
          <div className="flex items-baseline justify-between border-b border-gold/20 pb-4">
            <div>
              <p className="font-display text-2xl font-bold text-foreground">
                {formatINR(result.documentedTotal)}
              </p>
              <p className="text-xs text-foreground/60">
                {result.variantType === 'SINGLE' ? 'Single' : 'Couple'} · {result.months === 1 ? '1 Month' : `${result.months} Months`}
              </p>
            </div>
            {result.hasDiscount && (
              <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold">
                {result.discountNote}
              </span>
            )}
          </div>

          <div className="space-y-1 text-xs text-foreground/60">
            <div className="flex justify-between">
              <span>Base Amount</span>
              <span>{formatINR(result.monthlyBasePrice * result.months)}</span>
            </div>
            <div className="flex justify-between">
              <span>Inclusive of all applicable taxes/charges</span>
              <span>{formatINR(result.monthlyGst * result.months)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-gold/20">
              <span>Total Payable</span>
              <span>{formatINR(result.documentedTotal)}</span>
            </div>
          </div>

          {/* Included Services for this variant */}
          <ul className="space-y-1.5 pt-2 border-t border-gold/20">
            {result.services.map((svc) => (
              <li key={svc.serviceName} className="flex items-center gap-2 text-xs text-foreground/80">
                <CheckCircle className="size-3.5 shrink-0 text-gold" />
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
              className="mt-6 block w-full rounded-xl bg-gold px-6 py-3 text-center text-sm font-semibold text-brown transition-opacity hover:opacity-90"
            >
              Subscribe Now
            </button>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(getRenewUrl())}`}
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
