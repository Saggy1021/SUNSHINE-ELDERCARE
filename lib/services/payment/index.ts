import { db } from '@/lib/db'
import { DocumentSequenceService } from '@/lib/services/document-sequence'
import { notificationService } from '@/lib/services/notification'

export interface PaymentCheckoutRequest {
  invoiceId: string;
  userId: string;
  renewalRequestId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentCheckoutResponse {
  checkoutUrl: string;
  providerOrderId: string;
}

export interface PaymentProviderAdapter {
  createCheckoutSession(request: any): Promise<PaymentCheckoutResponse>;
  verifyWebhook(payload: any, signature: string, secret: string): Promise<boolean>;
  // Future methods: processRefund, getSubscriptionStatus, etc.
}

// Mock Adapter for Development
class MockPaymentAdapter implements PaymentProviderAdapter {
  async createCheckoutSession(request: any): Promise<PaymentCheckoutResponse> {
    console.log('[MockPayment] Creating checkout session for', request);
    return {
      checkoutUrl: `/checkout/pending`,
      providerOrderId: `pending_config_${Date.now()}`
    };
  }

  async verifyWebhook(payload: any, signature: string, secret: string): Promise<boolean> {
    console.log('[MockPayment] Webhook verification denied. Payment provider not configured.');
    return false;
  }
}

export class PaymentService {
  private adapter: PaymentProviderAdapter;

  constructor() {
    const provider = process.env.PAYMENT_PROVIDER || 'mock';
    
    // Abstract Factory pattern based on environment configuration
    switch (provider.toLowerCase()) {
      case 'stripe':
        // this.adapter = new StripeAdapter();
        // Fallback to mock if stripe adapter is not yet implemented
        console.warn('Stripe adapter not fully implemented yet, falling back to mock');
        this.adapter = new MockPaymentAdapter();
        break;
      case 'razorpay':
        // this.adapter = new RazorpayAdapter();
        console.warn('Razorpay adapter not fully implemented yet, falling back to mock');
        this.adapter = new MockPaymentAdapter();
        break;
      case 'mock':
      default:
        this.adapter = new MockPaymentAdapter();
        break;
    }
  }

  async createCheckoutSession(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResponse> {
    const invoice = await db.invoice.findUnique({
      where: { id: request.invoiceId }
    });

    if (!invoice) {
      throw new Error('Invoice not found for payment processing');
    }

    if (invoice.userId !== request.userId) {
      throw new Error('Unauthorized: Invoice does not belong to the current user');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Invoice is already paid');
    }

    // Update invoice status to ISSUED if it's DRAFT
    if (invoice.status === 'DRAFT') {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: 'ISSUED' }
      });
    }

    // We pass the trusted server-side total to the adapter
    const adapterRequest = {
      ...request,
      amount: invoice.total,
      currency: invoice.currency
    };

    const session = await this.adapter.createCheckoutSession(adapterRequest);

    // Create a PENDING payment record to track this initiation and link the renewal request
    await db.payment.create({
      data: {
        userId: request.userId,
        invoiceId: invoice.id,
        renewalRequestId: request.renewalRequestId,
        amount: invoice.total,
        currency: invoice.currency,
        paymentMethod: "ONLINE",
        status: "PENDING",
        provider: process.env.PAYMENT_PROVIDER || "SYSTEM",
        reference: session.providerOrderId
      }
    });

    return session;
  }

  async verifyWebhook(payload: any, signature: string, secret: string): Promise<boolean> {
    return this.adapter.verifyWebhook(payload, signature, secret);
  }
}

export const paymentService = new PaymentService();
export async function submitOfflinePayment(
  userId: string, 
  invoiceId: string, 
  renewalRequestId: string, 
  amount: number, 
  reference: string
) {
  // Validate ownership
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice || invoice.userId !== userId) {
    throw new Error("Invalid invoice")
  }
  
  if (invoice.total.toNumber() !== amount) {
    throw new Error("Amount mismatch")
  }

  const renewal = await db.renewalRequest.findUnique({ where: { id: renewalRequestId } })
  if (!renewal || renewal.userId !== userId) {
    throw new Error("Invalid renewal request")
  }
  
  if (renewal.status !== "APPROVED") {
    throw new Error("Renewal request must be approved before payment submission")
  }

  // Idempotency: check if verification pending payment already exists for this invoice
  const existingPending = await db.payment.findFirst({
    where: { invoiceId, status: { in: ["VERIFICATION_PENDING", "VERIFIED"] } }
  })
  
  if (existingPending) {
    throw new Error("A payment is already pending or verified for this invoice.")
  }

  // Create payment record using authoritative server-side values
  const payment = await db.payment.create({
    data: {
      userId,
      invoiceId,
      renewalRequestId,
      amount: invoice.total,
      currency: invoice.currency,
      paymentMethod: "OFFLINE",
      status: "VERIFICATION_PENDING",
      provider: "SYSTEM",
      reference,
    }
  })

  // Fire notification AFTER db operation succeeds
  notificationService.onPaymentSubmitted(payment).catch(() => {})

  return payment
}

export async function adminVerifyPayment(paymentId: string, adminUserId: string) {
  // 1. Fetch payment and relations
  const payment = await db.payment.findUnique({ 
    where: { id: paymentId },
    include: { 
      invoice: true, 
      renewalRequest: { include: { addOns: true, carePlan: true } },
      user: { include: { memberProfile: true } }
    }
  })
  
  if (!payment) throw new Error("Payment not found")
  if (payment.status === "VERIFIED") throw new Error("Payment is already verified")
  if (!payment.invoice || !payment.renewalRequest) throw new Error("Incomplete payment references")

  const { invoice, renewalRequest } = payment

  // 2. Perform Transactional settlement
  await db.$transaction(async (tx) => {
    
    // A. Mark Payment Verified (Atomic concurrency check)
    const updateResult = await tx.payment.updateMany({
      where: { id: paymentId, status: "VERIFICATION_PENDING" },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: adminUserId
      }
    })

    if (updateResult.count === 0) {
      throw new Error("Payment could not be verified. It may have already been processed.")
    }

    // B. Finalize Invoice (Snapshot and Numbering)
    const now = new Date()
    
    let officialInvoiceNumber = invoice.invoiceNumber
    if (!officialInvoiceNumber) {
      officialInvoiceNumber = await DocumentSequenceService.generateInvoiceNumber(now, tx)
    }

    const customerName = payment.user.name || "Member"
    const customerEmail = payment.user.email
    const customerAddress = payment.user.memberProfile?.serviceAddress || ""
    const customerPhone = payment.user.memberProfile?.mobileNumber || ""

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "ISSUED", // Automatically issue the invoice upon payment verification if not already issued
        paymentStatus: "PAID",
        paidDate: now,
        issueDate: invoice.status === "DRAFT" ? now : invoice.issueDate,
        invoiceNumber: officialInvoiceNumber,
        customerName: invoice.customerName || customerName,
        customerEmail: invoice.customerEmail || customerEmail,
        customerAddress: invoice.customerAddress || customerAddress,
        customerPhone: invoice.customerPhone || customerPhone,
      }
    })

    // B2. Create Receipt
    const receiptNumber = await DocumentSequenceService.generateReceiptNumber(now, tx)
    await tx.receipt.create({
      data: {
        receiptNumber,
        invoiceId: invoice.id,
        paymentId: payment.id,
        userId: payment.userId,
        customerName,
        customerEmail,
        customerAddress,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentReference: payment.reference,
        paymentDate: now,
        relatedPlanName: renewalRequest.carePlan?.name || "Membership Plan"
      }
    })

    // C. Handle Subscription Lifecycle Transition
    const isFuture = renewalRequest.requestedStartDate > now
    
    // We create a new Subscription record to cleanly separate historical from new memberships
    const newSubscription = await tx.subscription.create({
      data: {
        userId: renewalRequest.userId,
        carePlanId: renewalRequest.carePlanId,
        variantType: renewalRequest.variantType,
        durationMonths: renewalRequest.durationMonths,
        startDate: renewalRequest.requestedStartDate,
        endDate: renewalRequest.calculatedEndDate,
        status: isFuture ? "SCHEDULED" : "ACTIVE",
      }
    })

    if (renewalRequest.addOns.length > 0) {
      await tx.subscriptionAddOn.createMany({
        data: renewalRequest.addOns.map(addon => ({
          subscriptionId: newSubscription.id,
          addOnId: addon.addOnId
        }))
      })
    }

    // D. Finalize Renewal Request
    await tx.renewalRequest.update({
      where: { id: renewalRequest.id },
      data: { status: "COMPLETED" } 
    })

    // E. Create Audit Log
    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "PAYMENT_VERIFIED",
        entityType: "Payment",
        entityId: paymentId,
        metadata: { invoiceId: invoice.id, subscriptionId: newSubscription.id }
      }
    })
  })

  // Fire notifications AFTER successful transaction — never inside $transaction
  // Re-fetch the created subscription for notification context
  const newSub = await db.subscription.findFirst({
    where: { userId: renewalRequest.userId },
    include: { addOns: { include: { addOn: true } } },
    orderBy: { createdAt: 'desc' }
  })

  if (newSub) {
    notificationService.onPaymentVerified(payment, {
      status: newSub.status,
      startDate: newSub.startDate,
      endDate: newSub.endDate,
      carePlanId: newSub.carePlanId,
      variantType: newSub.variantType,
      durationMonths: newSub.durationMonths,
      addOns: newSub.addOns,
    }).catch(() => {})
  }
}

export async function adminRejectPayment(paymentId: string, adminUserId: string, reason: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error("Payment not found")
  if (payment.status === "VERIFIED") throw new Error("Cannot reject a verified payment")

  await db.$transaction(async (tx) => {
    const updateResult = await tx.payment.updateMany({
      where: { id: paymentId, status: "VERIFICATION_PENDING" },
      data: {
        status: "REJECTED",
        verifiedAt: new Date(),
        verifiedById: adminUserId,
        notes: reason
      }
    })

    if (updateResult.count === 0) {
      throw new Error("Payment could not be rejected. It may have already been processed.")
    }

    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "PAYMENT_REJECTED",
        entityType: "Payment",
        entityId: paymentId,
        metadata: { reason }
      }
    })
  })

  // Fire notification AFTER successful transaction
  const updatedPayment = await db.payment.findUnique({ where: { id: paymentId } })
  if (updatedPayment) {
    notificationService.onPaymentRejected(updatedPayment).catch(() => {})
  }
}
