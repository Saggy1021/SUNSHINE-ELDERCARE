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

export async function createRazorpayOrderAction(invoiceId: string, renewalId?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized. Please log in.' }
  }

  await RateLimitService.checkLimit('FINANCIAL')

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { user: { include: { memberProfile: true } } }
  })

  if (!invoice) {
    return { success: false, error: 'Invoice not found.' }
  }

  if (invoice.userId !== session.user.id) {
    return { success: false, error: 'Unauthorized: Invoice does not belong to the current user.' }
  }

  if (invoice.status === 'PAID') {
    return { success: false, error: 'Invoice is already paid.' }
  }

  try {
    const sessionResponse = await paymentService.createCheckoutSession({
      userId: session.user.id,
      invoiceId: invoice.id,
      renewalRequestId: renewalId || undefined,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${invoiceId}`
    })

    return {
      success: true,
      orderId: sessionResponse.providerOrderId,
      amount: sessionResponse.amount || Math.round(Number(invoice.total) * 100),
      currency: sessionResponse.currency || invoice.currency || 'INR',
      keyId: sessionResponse.keyId || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
      invoiceReference: invoice.referenceNumber || invoice.id,
      customer: {
        name: invoice.customerName || session.user.name || 'Member',
        email: invoice.customerEmail || session.user.email || '',
        contact: invoice.customerPhone || invoice.user?.memberProfile?.mobileNumber || ''
      }
    }
  } catch (error: any) {
    console.error('[createRazorpayOrderAction] Error:', error)
    return { success: false, error: error.message || 'Failed to create payment order.' }
  }
}

export async function verifyRazorpayCheckoutAction(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  invoiceId: string;
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized.' }
  }

  await RateLimitService.checkLimit('FINANCIAL')

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = input

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { success: false, error: 'Missing required Razorpay payment confirmation parameters.' }
  }

  // 1. Verify cryptographic signature
  const { verifyRazorpayCheckoutSignature } = await import('@/lib/services/payment/razorpay-adapter')
  const isValid = verifyRazorpayCheckoutSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature
  })

  if (!isValid) {
    console.error('[verifyRazorpayCheckoutAction] Invalid signature received from client.')
    return { success: false, error: 'Invalid payment signature. Verification failed.' }
  }

  // 2. Validate internal ownership & state using exact submitted Razorpay Order ID
  const payment = await db.payment.findFirst({
    where: {
      OR: [
        { providerRef: razorpay_order_id },
        { reference: razorpay_order_id },
      ],
    },
    include: { invoice: true },
  })

  if (!payment) {
    return { success: false, error: 'Payment record not found for the provided Razorpay Order ID.' }
  }

  if (payment.userId !== session.user.id) {
    return { success: false, error: 'Unauthorized: Payment does not belong to active member.' }
  }

  if (payment.invoiceId && invoiceId && payment.invoiceId !== invoiceId) {
    return { success: false, error: 'Invoice mismatch for payment verification.' }
  }

  // Order correlation: Ensure payment record matches the verified Razorpay order
  if (payment.providerRef && payment.providerRef !== razorpay_order_id) {
    return { success: false, error: 'Payment order ID mismatch.' }
  }

  // 3. Fast-path if webhook has already settled this payment concurrently
  if (payment.status === 'VERIFIED') {
    return { success: true, alreadyVerified: true }
  }

  // 4. Perform atomic settlement
  const { settleSuccessfulPayment } = await import('@/lib/services/payment/settlement')
  const result = await settleSuccessfulPayment({
    orderId: razorpay_order_id,
    paymentId: payment.id,
    invoiceId,
    providerPaymentId: razorpay_payment_id,
    provider: 'RAZORPAY',
    amountInPaise: payment.amount ? Math.round(payment.amount.toNumber() * 100) : undefined,
    currency: payment.currency,
    verifiedById: null,
    metadata: {
      source: 'CHECKOUT_MODAL',
      razorpay_order_id,
      razorpay_payment_id,
      actor: 'CHECKOUT_MODAL',
      payerUserId: session.user.id,
    }
  })

  if (!result.success) {
    return { success: false, error: result.error || 'Settlement failed.' }
  }

  return { success: true, alreadyVerified: result.alreadyVerified }
}
