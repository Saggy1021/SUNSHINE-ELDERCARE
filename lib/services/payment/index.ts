import { db } from '@/lib/db'
import { DocumentSequenceService } from '@/lib/services/document-sequence'
import { MemberIdentityService } from '@/lib/services/member-identity'
import { calculateEndDate } from '@/lib/services/dates'
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
  keyId?: string;
  amount?: number;
  currency?: string;
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

import { RazorpayAdapter } from './razorpay-adapter';
export { RazorpayAdapter } from './razorpay-adapter';
export * from './settlement';

export class PaymentService {
  private adapter: PaymentProviderAdapter;

  constructor(adapterOverride?: PaymentProviderAdapter) {
    if (adapterOverride) {
      this.adapter = adapterOverride;
      return;
    }

    const provider = process.env.PAYMENT_PROVIDER || 'mock';
    
    // Abstract Factory pattern based on environment configuration
    switch (provider.toLowerCase()) {
      case 'stripe':
        // Fallback to mock if stripe adapter is not yet implemented
        console.warn('Stripe adapter not fully implemented yet, falling back to mock');
        this.adapter = new MockPaymentAdapter();
        break;
      case 'razorpay':
        // Real RazorpayAdapter: Fails closed if credentials are not configured
        this.adapter = new RazorpayAdapter();
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
        providerRef: session.providerOrderId,
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

export interface AdminVerifyPaymentTestDependencies {
  dbClient?: any;
  documentSequences?: typeof DocumentSequenceService;
  memberIdentity?: typeof MemberIdentityService;
  notifications?: typeof notificationService;
  calculateEndDateFn?: typeof calculateEndDate;
  now?: () => Date;
}

export async function adminVerifyPayment(
  paymentId: string,
  adminUserId: string,
  dependencies: AdminVerifyPaymentTestDependencies = {}
) {
  // Dependency overrides keep production defaults intact while allowing the actual
  // settlement orchestration to be exercised with an isolated transactional client.
  const database = dependencies.dbClient || db;
  const documentSequences = dependencies.documentSequences || DocumentSequenceService;
  const memberIdentity = dependencies.memberIdentity || MemberIdentityService;
  const notifications = dependencies.notifications || notificationService;
  const getNow = dependencies.now || (() => new Date());
  // 1. Fetch payment and relations
  const payment = await database.payment.findUnique({ 
    where: { id: paymentId },
    include: { 
      invoice: { include: { lineItems: true } }, 
      renewalRequest: { include: { addOns: true, carePlan: true } },
      user: { include: { memberProfile: true } }
    }
  })
  
  if (!payment) throw new Error("Payment not found")
  if (payment.status === "VERIFIED") throw new Error("Payment is already verified")
  if (!payment.invoice) throw new Error("Incomplete payment references: invoice is missing")

  const { invoice, renewalRequest } = payment

  let createdSubscriptionId: string | undefined;

  // 2. Perform Transactional settlement with Canonical Lock Ordering:
  // Invoice (FOR UPDATE) -> Payment -> remaining settlement records
  await database.$transaction(async (tx) => {
    // A. Shared Invoice Locking via SELECT ... FOR UPDATE
    let lockedInvoice: {
      id: string;
      paymentStatus: string;
      status: string;
      invoiceNumber: string | null;
      customerName: string | null;
      customerEmail: string | null;
      customerAddress: string | null;
      customerPhone: string | null;
      issueDate: Date;
      planId: string | null;
    } | null = null;

    if (typeof (tx as any).$queryRaw === 'function') {
      const lockedInvoices = await (tx as any).$queryRaw`
        SELECT
          id,
          "paymentStatus",
          status,
          "invoiceNumber",
          "customerName",
          "customerEmail",
          "customerAddress",
          "customerPhone",
          "issueDate",
          "planId"
        FROM "Invoice"
        WHERE id = ${invoice.id}
        FOR UPDATE
      `;
      if (Array.isArray(lockedInvoices) && lockedInvoices.length > 0) {
        lockedInvoice = lockedInvoices[0];
      }
    }

    if (!lockedInvoice) {
      lockedInvoice = await tx.invoice.findUnique({
        where: { id: invoice.id },
      });
    }

    if (!lockedInvoice) {
      throw new Error(`Invoice ${invoice.id} not found during manual payment verification`);
    }

    if (lockedInvoice.paymentStatus === 'PAID') {
      throw new Error("Invoice is already paid");
    }

    // Ensure member identity (e.g. SEC/MEM/...) is generated and assigned
    await memberIdentity.ensureMemberIdForUser(
      payment.userId,
      invoice.lineItems?.[0]?.variantType || renewalRequest?.variantType || 'SINGLE',
      tx
    );

    // B. Mark Payment Verified (Atomic concurrency check on Payment row)
    const updateResult = await tx.payment.updateMany({
      where: { id: paymentId, status: "VERIFICATION_PENDING" },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: adminUserId
      }
    });

    if (updateResult.count === 0) {
      throw new Error("Payment could not be verified. It may have already been processed.");
    }

    // C. Finalize Invoice (Snapshot and Numbering)
    const now = getNow();
    
    let officialInvoiceNumber = lockedInvoice.invoiceNumber;
    if (!officialInvoiceNumber) {
      officialInvoiceNumber = await documentSequences.generateInvoiceNumber(now, tx);
    }

    const customerName = lockedInvoice.customerName || payment.user?.name || "Member";
    const customerEmail = lockedInvoice.customerEmail || payment.user?.email || "";
    const customerAddress = lockedInvoice.customerAddress || payment.user?.memberProfile?.serviceAddress || "";
    const customerPhone = lockedInvoice.customerPhone || payment.user?.memberProfile?.mobileNumber || "";

    await tx.invoice.update({
      where: { id: lockedInvoice.id },
      data: {
        status: "ISSUED", // Automatically issue the invoice upon payment verification if not already issued
        paymentStatus: "PAID",
        paidDate: now,
        issueDate: lockedInvoice.status === "DRAFT" ? now : lockedInvoice.issueDate,
        invoiceNumber: officialInvoiceNumber,
        customerName,
        customerEmail,
        customerAddress,
        customerPhone,
      }
    });

    // D. Determine relatedPlanName for receipt
    let relatedPlanName = "Membership Plan";
    if (renewalRequest?.carePlan?.name) {
      relatedPlanName = renewalRequest.carePlan.name;
    } else if (invoice.lineItems?.[0]?.planName) {
      relatedPlanName = invoice.lineItems[0].planName;
    } else if (lockedInvoice.planId) {
      relatedPlanName = lockedInvoice.planId;
    }

    // Create Receipt
    const receiptNumber = await documentSequences.generateReceiptNumber(now, tx);
    await tx.receipt.create({
      data: {
        receiptNumber,
        invoiceId: lockedInvoice.id,
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
        relatedPlanName
      }
    });

    // E. Handle Subscription Lifecycle Transition
    if (renewalRequest) {
      // Flow 1: Renewal Request
      const isFuture = renewalRequest.requestedStartDate > now;
      
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
      });
      createdSubscriptionId = newSubscription.id;

      if (renewalRequest.addOns.length > 0) {
        await tx.subscriptionAddOn.createMany({
          data: renewalRequest.addOns.map((addon: any) => ({
            subscriptionId: newSubscription.id,
            addOnId: addon.addOnId
          }))
        });
      }

      // Expire old subscription to prevent overlapping active memberships
      if (renewalRequest.currentSubscriptionId && !isFuture) {
        await tx.subscription.update({
          where: { id: renewalRequest.currentSubscriptionId },
          data: {
            status: "EXPIRED",
            endDate: now
          }
        });
      }

      // Finalize Renewal Request
      await tx.renewalRequest.update({
        where: { id: renewalRequest.id },
        data: { status: "COMPLETED" } 
      });
    } else if (lockedInvoice.planId || invoice.lineItems?.[0]) {
      // Flow 2: Admin Onboarding / Direct Plan Purchase (No Renewal Request)
      const lineItem = invoice.lineItems?.[0];
      const durationMonths = lineItem?.durationMonths || 1;
      const purchaseVariantType = lineItem?.variantType || "SINGLE";
      const calculatedEndDate = dependencies.calculateEndDateFn ? dependencies.calculateEndDateFn(now, durationMonths) : calculateEndDate(now, durationMonths);
      const planReference = lockedInvoice.planId || lineItem?.planName || "";

      // Lookup CarePlan by ID or slug
      const carePlan = await tx.carePlan.findFirst({
        where: {
          OR: [
            { id: planReference },
            { slug: planReference }
          ]
        }
      });

      let legacyPlanId: string | null = null;
      if (!carePlan && planReference) {
        const legacyPlan = await tx.plan.findUnique({
          where: { id: planReference }
        });
        legacyPlanId = legacyPlan?.id || null;
      }

      // Never settle a payment unless the purchased plan resolves to a real catalog record.
      if (!carePlan && !legacyPlanId) {
        throw new Error("Cannot activate membership: the invoice does not reference a valid care plan.");
      }

      if (!Number.isInteger(durationMonths) || durationMonths < 1) {
        throw new Error("Cannot activate membership: the invoice contains an invalid subscription duration.");
      }

      // Expire prior active subscription to prevent overlapping active memberships
      await tx.subscription.updateMany({
        where: {
          userId: payment.userId,
          status: "ACTIVE"
        },
        data: {
          status: "EXPIRED",
          endDate: now
        }
      });

      const newSubscription = await tx.subscription.create({
        data: {
          userId: payment.userId,
          carePlanId: carePlan?.id || null,
          planId: legacyPlanId,
          variantType: purchaseVariantType,
          durationMonths,
          startDate: now,
          endDate: calculatedEndDate,
          status: "ACTIVE"
        }
      });
      createdSubscriptionId = newSubscription.id;
    }

    // A verified payment must always produce exactly one subscription lifecycle transition.
    // Throwing here rolls back payment, invoice, receipt, and identity changes together.
    if (!createdSubscriptionId) {
      throw new Error("Payment cannot be verified without creating a membership subscription.");
    }

    // G. Create Audit Log
    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "PAYMENT_VERIFIED",
        entityType: "Payment",
        entityId: paymentId,
        metadata: {
          invoiceId: lockedInvoice.id,
          subscriptionId: createdSubscriptionId,
          actor: "ADMIN",
          settlementRole: "MANUAL_VERIFICATION"
        }
      }
    });
  })

  // Notify about the exact subscription created by this settlement, not merely the
  // most recently created subscription for the user (which may belong to another flow).
  if (createdSubscriptionId) {
    const newSub = await database.subscription.findUnique({
      where: { id: createdSubscriptionId },
      include: { addOns: { include: { addOn: true } } },
    });

    if (newSub) {
      notifications.onPaymentVerified(payment, {
      status: newSub.status,
      startDate: newSub.startDate,
      endDate: newSub.endDate,
      carePlanId: newSub.carePlanId,
      variantType: newSub.variantType,
      durationMonths: newSub.durationMonths,
        addOns: newSub.addOns,
      }).catch(() => {});
    }
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
