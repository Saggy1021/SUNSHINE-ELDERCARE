import { redirect } from 'next/navigation'

import { initiateCheckout } from '@/app/actions/checkout'
import { Button } from '@/components/ui/button'
import { pricingService } from '@/lib/services/pricing'
import { taxService } from '@/lib/services/tax'
import Link from 'next/link'

interface CheckoutPageProps {
  searchParams: Promise<{
    planId?: string
  }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const planId = resolvedSearchParams.planId;
  if (!planId) {
    redirect('/membership')
  }

  let pricingResult;
  let taxResult;
  let taxPending = false;

  try {
    // 1. Get authoritative preview from server
    pricingResult = await pricingService.calculateSubtotal({ planId });
    
    try {
      // 2. Get authoritative tax preview
      taxResult = await taxService.calculateTax(pricingResult);
    } catch (e: any) {
      if (e.message === 'TAX_CONFIGURATION_PENDING') {
        taxPending = true;
      } else {
        throw e;
      }
    }
  } catch (e: any) {
    console.error('[Checkout] Error loading pricing:', e);
    // If plan isn't found in DB, fail safely instead of falling back
    return (
      <main className="min-h-screen bg-ivory pt-32 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-gold/20">
            <h1 className="text-3xl font-display font-bold text-maroon mb-4">Configuration Error</h1>
            <p className="text-foreground/70 font-serif mb-8">
              The selected plan is not currently available in our system. Please contact support.
            </p>
            <Link href="/membership">
              <Button className="bg-maroon hover:bg-maroon/90 text-white">Return to Memberships</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-gold/20">
          <h1 className="text-3xl font-display font-bold text-maroon mb-2">Checkout Summary</h1>
          <p className="text-foreground/70 font-serif mb-8 border-b border-gold/30 pb-4">
            Review your membership details before proceeding to payment.
          </p>

          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display text-xl font-bold">{pricingResult.lineItems[0].description}</h3>
                <p className="text-sm text-foreground/70 font-serif">Annual Subscription</p>
              </div>
              <div className="text-lg font-bold text-foreground">
                ₹{pricingResult.basePrice.toLocaleString()}
              </div>
            </div>

            {/* In a fuller implementation, loop over addOns here */}
            {pricingResult.addOnsTotal > 0 && (
               <div className="flex justify-between items-center">
                 <h4 className="font-display text-md">Add-ons</h4>
                 <div className="text-md font-bold text-foreground">
                   ₹{pricingResult.addOnsTotal.toLocaleString()}
                 </div>
               </div>
            )}

            <div className="pt-4 border-t border-gold/30 flex justify-between items-center font-bold text-lg">
              <span>Subtotal</span>
              <span>₹{pricingResult.subtotal.toLocaleString()}</span>
            </div>

            {taxPending ? (
              <div className="bg-amber-50 text-amber-900 p-4 rounded-xl text-sm font-serif border border-amber-200 mt-4">
                <p className="font-bold mb-1">Final Quotation Required</p>
                <p>Because your specific care requirements dictate tax applicability, we need to generate a final custom quotation for you before payment.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-foreground/80">
                  <span>Applicable Tax ({taxResult?.taxRateApplied}%)</span>
                  <span>₹{taxResult?.taxAmount.toLocaleString()}</span>
                </div>
                
                <div className="pt-4 border-t border-gold/30 flex justify-between items-center font-bold text-2xl">
                  <span>Total Payable</span>
                  <span className="text-maroon">₹{taxResult?.total.toLocaleString()}</span>
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
            <form action={initiateCheckout.bind(null, planId, [])}>
              <Button type="submit" size="lg" className="w-full bg-maroon hover:bg-maroon/90 text-white text-lg">
                Proceed to Secure Payment
              </Button>
            </form>
          )}
          
          <p className="text-center text-xs text-foreground/50 mt-6 font-serif">
            Your payment is securely processed. We do not store your card details.
            By proceeding, you agree to our Terms and Conditions.
          </p>
        </div>
      </div>
    </main>
  )
}