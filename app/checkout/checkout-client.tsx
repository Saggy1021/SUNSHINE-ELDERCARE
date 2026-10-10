'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { calculateCheckoutPreview, initiateCheckout } from '@/app/actions/checkout'

export function CheckoutClient({ planId, initialPricing, initialTax, initialTaxPending, availableAddOns }: any) {
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [pricing, setPricing] = useState(initialPricing)
  const [tax, setTax] = useState(initialTax)
  const [taxPending, setTaxPending] = useState(initialTaxPending)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const updatePricing = async () => {
      setLoading(true)
      const res = await calculateCheckoutPreview(planId, selectedAddOns)
      if (mounted) {
        if (res.success) {
          setPricing(res.pricingResult)
          setTax(res.taxResult)
          setTaxPending(res.taxPending)
          setError(null)
        } else {
          setError(res.error)
        }
        setLoading(false)
      }
    }
    // Only fetch if selectedAddOns length > 0, otherwise we know the base
    if (selectedAddOns.length > 0) {
      updatePricing()
    } else {
      setPricing(initialPricing)
      setTax(initialTax)
      setTaxPending(initialTaxPending)
      setError(null)
    }
    return () => { mounted = false }
  }, [selectedAddOns, planId, initialPricing, initialTax, initialTaxPending])

  const handleToggleAddOn = (id: string) => {
    setSelectedAddOns(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  return (
    <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-gold/20 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2rem]">
          <div className="text-maroon font-serif">Recalculating...</div>
        </div>
      )}
      
      <h1 className="text-3xl font-display font-bold text-maroon mb-2">Checkout Summary</h1>
      <p className="text-foreground/70 font-serif mb-8 border-b border-gold/30 pb-4">
        Review your membership details and select optional add-ons.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-xl font-bold">{pricing.lineItems[0].description}</h3>
            <p className="text-sm text-foreground/70 font-serif mt-1">Base Subscription</p>
          </div>
          <div className="text-lg font-bold text-foreground">
            ₹{pricing.basePrice.toLocaleString('en-IN')}
          </div>
        </div>

        {availableAddOns.length > 0 && (
          <div className="pt-4 border-t border-gold/10">
            <h4 className="font-display text-lg mb-3">Optional Add-ons</h4>
            <div className="space-y-2">
              {availableAddOns.map((addon: any) => (
                <label key={addon.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedAddOns.includes(addon.id) ? 'border-maroon bg-maroon/5' : 'border-gold/30 hover:border-maroon/50'}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon accent-maroon"
                      checked={selectedAddOns.includes(addon.id)}
                      onChange={() => handleToggleAddOn(addon.id)}
                    />
                    <span className="font-medium">{addon.name}</span>
                  </div>
                  <span className="font-bold text-maroon">₹{addon.price.toLocaleString('en-IN')}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {pricing.addOnsTotal > 0 && (
          <div className="flex justify-between items-center bg-maroon/5 p-3 rounded-lg mt-4">
            <span className="font-semibold">Add-ons Subtotal</span>
            <span className="font-bold text-maroon">₹{pricing.addOnsTotal.toLocaleString('en-IN')}</span>
          </div>
        )}

        <div className="pt-4 border-t border-gold/30 flex justify-between items-center font-bold text-lg">
          <span>Subtotal</span>
          <span>₹{pricing.subtotal.toLocaleString('en-IN')}</span>
        </div>

        {taxPending ? (
          <div className="bg-amber-50 text-amber-900 p-4 rounded-xl text-sm font-serif border border-amber-200 mt-4">
            <p className="font-bold mb-1">Final Quotation Required</p>
            <p>Because your specific care requirements dictate tax applicability, we need to generate a final custom quotation for you before payment.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center text-foreground/80">
              <span>Applicable Tax ({tax?.taxRateApplied || 0}%)</span>
              <span>₹{tax?.taxAmount?.toLocaleString('en-IN') || 0}</span>
            </div>
            
            <div className="pt-4 border-t border-gold/30 flex justify-between items-center font-bold text-2xl">
              <span>Total Payable</span>
              <span className="text-maroon">₹{tax?.total?.toLocaleString('en-IN') || 0}</span>
            </div>
          </>
        )}
      </div>

      {taxPending ? (
        <Link href="/care-assessment">
          <Button size="lg" className="w-full bg-gold hover:bg-gold/90 text-maroon font-bold text-lg">
            Request Custom Quotation
          </Button>
        </Link>
      ) : (
        <form action={() => initiateCheckout(planId, selectedAddOns)}>
          <Button type="submit" disabled={loading} size="lg" className="w-full bg-maroon hover:bg-maroon/90 text-white text-lg disabled:opacity-70">
            Proceed to Secure Payment
          </Button>
        </form>
      )}
      
      <p className="text-center text-xs text-foreground/50 mt-6 font-serif">
        Your payment is securely processed. We do not store your card details.
        By proceeding, you agree to our Terms and Conditions.
      </p>
    </div>
  )
}
