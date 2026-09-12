'use server'

import { auth } from '@/auth'
import { paymentService } from '@/lib/services/payment'
import { pricingService } from '@/lib/services/pricing'
import { taxService } from '@/lib/services/tax'
import { invoiceService } from '@/lib/services/invoice'
import { redirect } from 'next/navigation'

export async function initiateCheckout(planId: string, addOnIds: string[] = []) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout?planId=${planId}`)
  }

  // 1. Authoritative Pricing
  const pricingResult = await pricingService.calculateSubtotal({
    planId,
    addOnIds
  });

  // 2. Authoritative Tax
  // This will throw TAX_CONFIGURATION_PENDING if no active rule exists.
  const taxResult = await taxService.calculateTax(pricingResult);

  // 3. Create Immutable Invoice
  const invoice = await invoiceService.createInvoice(
    session.user.id,
    pricingResult,
    taxResult,
    planId
  );

  // 4. Initiate Payment
  const response = await paymentService.createCheckoutSession({
    userId: session.user.id,
    invoiceId: invoice.id,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/membership?canceled=true`
  })

  redirect(response.checkoutUrl)
}
