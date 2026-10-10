import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { pricingService } from '@/lib/services/pricing'
import { taxService } from '@/lib/services/tax'
import Link from 'next/link'
import { CheckoutClient } from './checkout-client'

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
  let taxResult = null;
  let taxPending = false;
  let availableAddOns: any[] = [];

  try {
    // 1. Get authoritative preview from server
    pricingResult = await pricingService.calculateSubtotal({ planId });
    
    // 2. Fetch compatible add-ons
    const planAddOns = await db.planAddOn.findMany({
      where: { planId },
      include: { addOn: true }
    });
    availableAddOns = planAddOns.map(pa => pa.addOn).filter(a => a.active);

    try {
      // 3. Get authoritative tax preview
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
        <CheckoutClient 
          planId={planId} 
          initialPricing={pricingResult} 
          initialTax={taxResult} 
          initialTaxPending={taxPending} 
          availableAddOns={availableAddOns} 
        />
      </div>
    </main>
  )
}
