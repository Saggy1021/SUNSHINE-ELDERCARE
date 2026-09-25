'use server'

import { auth } from '@/auth'
import { paymentService } from '@/lib/services/payment'
import { carePricingService } from '@/lib/services/care-plans'
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

export async function initiatePaymentAction(formData: FormData) {
  const session = await auth()
  const invoiceId = formData.get('invoiceId') as string
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/${invoiceId}`)
  }

  const response = await paymentService.createCheckoutSession({
    userId: session.user.id,
    invoiceId: invoiceId,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${invoiceId}`
  })
  redirect(response.checkoutUrl)
}

export async function initiateRenewalCheckout(renewalRequestId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard`)
  }

  const renewal = await db.renewalRequest.findUnique({
    where: { id: renewalRequestId },
    include: { addOns: true, carePlan: true }
  })

  if (!renewal || renewal.userId !== session.user.id) {
    throw new Error("Invalid renewal request")
  }
  
  if (renewal.status !== "APPROVED") {
    throw new Error("Renewal request is not approved yet")
  }

  const pricingResult = await carePricingService.lookupPrice({
    planSlug: renewal.carePlan.slug,
    variantType: renewal.variantType as 'SINGLE' | 'COUPLE',
    months: renewal.durationMonths,
  });

  const taxResult = await taxService.calculateCarePlanTax(pricingResult);

  const invoice = await invoiceService.createCarePlanInvoice(
    session.user.id,
    pricingResult,
    taxResult
  );

  redirect(`/checkout/${invoice.id}?renewal=${renewalRequestId}`)
}
