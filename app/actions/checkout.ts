'use server'

import { auth } from '@/auth'
import { paymentService } from '@/lib/services/payment'
import { pricingService } from '@/lib/services/pricing'
import { carePricingService } from '@/lib/services/care-plans'
import { taxService } from '@/lib/services/tax'
import { db } from '@/lib/db'
import { invoiceService } from '@/lib/services/invoice'
import { redirect } from 'next/navigation'
import { RateLimitService } from '@/lib/services/rate-limit'

export async function calculateCheckoutPreview(planId: string, addOnIds: string[] = []) {
  try {
    const pricingResult = await pricingService.calculateSubtotal({ planId, addOnIds })
    try {
      const taxResult = await taxService.calculateTax(pricingResult)
      return { success: true, pricingResult, taxResult, taxPending: false }
    } catch (e: any) {
      if (e.message === 'TAX_CONFIGURATION_PENDING') {
        return { success: true, pricingResult, taxResult: null, taxPending: true }
      }
      throw e
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function initiateCheckout(planId: string, addOnIds: string[] = []) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout?planId=${planId}`)
  }

  await RateLimitService.checkLimit('FINANCIAL')

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
  const renewalId = formData.get('renewalId') as string
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/${invoiceId}`)
  }

  await RateLimitService.checkLimit('FINANCIAL')

  const response = await paymentService.createCheckoutSession({
    userId: session.user.id,
    invoiceId: invoiceId,
    renewalRequestId: renewalId || undefined,
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

  await RateLimitService.checkLimit('FINANCIAL')

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

  // Check for existing invoice to enforce idempotency
  const existingInvoice = await db.invoice.findUnique({
    where: { idempotencyKey: renewalRequestId }
  })

  if (existingInvoice) {
    if (existingInvoice.status === "DRAFT" || existingInvoice.paymentStatus === "UNPAID") {
      redirect(`/checkout/${existingInvoice.id}?renewal=${renewalRequestId}`)
    } else {
      throw new Error("This renewal request has already been paid or processed.")
    }
  }

  let invoice;

  if (renewal.requestType === "UPGRADE") {
    if (!renewal.customPrice) throw new Error("Upgrade amount not set")
    const pricingResult: any = {
      basePrice: renewal.customPrice.toNumber(),
      addOnsTotal: 0,
      discount: 0,
      subtotal: renewal.customPrice.toNumber(),
      currency: 'INR',
      lineItems: [{
        description: `Upgrade to ${renewal.planName} - ${renewal.variantType}`,
        quantity: 1,
        unitPrice: renewal.customPrice.toNumber(),
        total: renewal.customPrice.toNumber(),
        type: 'PLAN',
        referenceId: renewal.id,
        taxClassification: 'CARE_PLAN_GST'
      }]
    }
    const taxResult = await taxService.calculateTax(pricingResult)
    invoice = await invoiceService.createInvoice(
      session.user.id,
      pricingResult,
      taxResult,
      undefined,
      renewalRequestId
    )
  } else {
    const pricingResult = await carePricingService.lookupPrice({
      planSlug: renewal.carePlan.slug,
      variantType: renewal.variantType as 'SINGLE' | 'COUPLE',
      months: renewal.durationMonths,
    });

    const taxResult = await taxService.calculateCarePlanTax(pricingResult);

    invoice = await invoiceService.createCarePlanInvoice(
      session.user.id,
      pricingResult,
      taxResult,
      renewalRequestId
    );
  }

  redirect(`/checkout/${invoice.id}?renewal=${renewalRequestId}`)
}
