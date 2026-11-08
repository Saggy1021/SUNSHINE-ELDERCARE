import { db } from '@/lib/db';
import { DocumentSequenceService } from '@/lib/services/document-sequence';
import { notificationService } from '@/lib/services/notification';
import { calculateEndDate } from '@/lib/services/dates';

export interface SettleSuccessfulPaymentInput {
  orderId?: string;
  paymentId?: string;
  invoiceId?: string;
  providerPaymentId: string; // Razorpay payment ID (e.g. pay_xxx)
  provider?: string; // e.g. "RAZORPAY"
  amountInPaise?: number;
  currency?: string;
  verifiedById?: string | null; // null for automated settlements, or admin user ID
  metadata?: Record<string, any>;
}

export interface SettlePaymentResult {
  success: boolean;
  alreadyVerified: boolean;
  paymentId?: string;
  invoiceId?: string;
  subscriptionId?: string;
  isOverpayment?: boolean;
  error?: string;
}

/**
 * Shared transactional settlement function.
 * Ensures exactly-once payment verification, invoice issuance, receipt minting,
 * subscription lifecycle transition, and audit logging.
 *
 * Safe against concurrent calls between Webhooks and Checkout Return.
 */
export async function settleSuccessfulPayment(
  input: SettleSuccessfulPaymentInput
): Promise<SettlePaymentResult> {
  const {
    orderId,
    paymentId,
    invoiceId,
    providerPaymentId,
    provider = 'RAZORPAY',
    amountInPaise,
    currency,
    verifiedById = null,
    metadata,
  } = input;

  if (!providerPaymentId) {
    throw new Error('providerPaymentId is required for payment settlement');
  }

  // Foreign-key integrity: Automated settlement must set Payment.verifiedById to null
  // because verifiedById references User(id). Automated actor identity is preserved in metadata.
  const isAutomatedSettlement =
    !verifiedById ||
    (typeof verifiedById === 'string' &&
      (verifiedById.startsWith('RAZORPAY') ||
        verifiedById.startsWith('SYSTEM') ||
        verifiedById.includes('WEBHOOK') ||
        verifiedById.includes('CHECKOUT')));

  const resolvedVerifiedById = isAutomatedSettlement ? null : verifiedById;
  const auditActorUserId = isAutomatedSettlement ? null : verifiedById;

  const actorIdentity =
    metadata?.actor ||
    (typeof verifiedById === 'string' &&
    (verifiedById.startsWith('RAZORPAY') || verifiedById.startsWith('SYSTEM'))
      ? verifiedById
      : provider === 'RAZORPAY'
      ? 'RAZORPAY_SYSTEM'
      : 'SYSTEM_AUTOMATED');

  // 1. Locate the internal payment record using strictly prioritised matching
  let payment: any = null;

  const paymentInclude = {
    invoice: {
      include: { lineItems: true },
    },
    renewalRequest: {
      include: { addOns: true, carePlan: true },
    },
    user: {
      include: { memberProfile: true },
    },
  };

  // Priority 1: Exact Razorpay Order ID match using providerRef (or initial reference)
  if (orderId) {
    payment = await db.payment.findFirst({
      where: {
        OR: [
          { providerRef: orderId },
          { reference: orderId },
        ],
      },
      include: paymentInclude,
    });

    // If an Order ID was supplied, do NOT silently select another attempt by invoice ID
    if (!payment) {
      return {
        success: false,
        alreadyVerified: false,
        error: 'PAYMENT_CONTEXT_NOT_FOUND',
      };
    }

    // Reject conflicting identifiers
    if (payment.providerRef && payment.providerRef !== orderId) {
      return {
        success: false,
        alreadyVerified: false,
        error: 'PAYMENT_ORDER_ID_CONFLICT',
      };
    }
  }

  // Priority 2: If no Order ID match exists (or not supplied), resolve by exact Payment ID
  if (!payment && (providerPaymentId || paymentId)) {
    payment = await db.payment.findFirst({
      where: {
        OR: [
          paymentId ? { id: paymentId } : undefined,
          providerPaymentId ? { reference: providerPaymentId } : undefined,
        ].filter(Boolean) as any,
      },
      include: paymentInclude,
    });
  }

  // Priority 3: Invoice fallback ONLY when NO provider identifier was supplied and candidate is unambiguous
  if (!payment && !orderId && invoiceId) {
    const candidates = await db.payment.findMany({
      where: {
        invoiceId,
        status: 'PENDING',
      },
      include: paymentInclude,
    });

    if (candidates.length === 1) {
      payment = candidates[0];
    } else if (candidates.length > 1) {
      return {
        success: false,
        alreadyVerified: false,
        error: 'AMBIGUOUS_PAYMENT_CONTEXT',
      };
    }
  }

  if (!payment) {
    return {
      success: false,
      alreadyVerified: false,
      error: 'PAYMENT_CONTEXT_NOT_FOUND',
    };
  }

  // 2. Idempotency Check: If already verified, exit cleanly
  if (payment.status === 'VERIFIED') {
    return {
      success: true,
      alreadyVerified: true,
      paymentId: payment.id,
      invoiceId: payment.invoiceId || undefined,
    };
  }

  // 3. Amount and currency validation
  const expectedPaise = Math.round(payment.amount.toNumber() * 100);
  if (amountInPaise !== undefined && amountInPaise !== expectedPaise) {
    throw new Error(
      `Payment amount mismatch: Expected ${expectedPaise} paise, but received ${amountInPaise} paise. Settlement halted.`
    );
  }

  if (currency && currency.toUpperCase() !== payment.currency.toUpperCase()) {
    throw new Error(
      `Payment currency mismatch: Expected ${payment.currency}, received ${currency}. Settlement halted.`
    );
  }

  // 4. Atomic Transactional Settlement
  let createdSubscriptionId: string | undefined;
  let wasConcurrentlySettled = false;
  let isSecondaryOverpayment = false;

  const targetInvoiceId = payment.invoiceId || invoiceId;
  if (!targetInvoiceId) {
    throw new Error(`Invoice missing for payment ${payment.id}`);
  }

  await db.$transaction(async (tx) => {
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
        WHERE id = ${targetInvoiceId}
        FOR UPDATE
      `;
      if (Array.isArray(lockedInvoices) && lockedInvoices.length > 0) {
        lockedInvoice = lockedInvoices[0];
      }
    }

    if (!lockedInvoice) {
      lockedInvoice = await tx.invoice.findUnique({
        where: { id: targetInvoiceId },
      });
    }

    if (!lockedInvoice) {
      throw new Error(`Invoice ${targetInvoiceId} not found during locked settlement`);
    }

    const isInvoiceAlreadyPaid = lockedInvoice.paymentStatus === 'PAID';

    // B. Secondary Captured Payment on an Already-Paid Invoice
    if (isInvoiceAlreadyPaid) {
      const updateResult = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          providerRef: payment.providerRef || orderId || undefined,
          reference: providerPaymentId,
          provider,
          verifiedById: resolvedVerifiedById,
          metadata: {
            ...(metadata || {}),
            settlementRole: 'SECONDARY_OVERPAYMENT',
            reconciliationStatus: 'NEEDS_REFUND_OR_CREDIT',
            refundDecisionOutstanding: true,
            secondaryCapturedPaymentId: providerPaymentId,
            secondaryCapturedOrderId: orderId || payment.providerRef || null,
            actor: actorIdentity,
            automatedVerification: !resolvedVerifiedById,
            note: 'Invoice already PAID. Genuine payment captured as secondary overpayment; invoice-level settlement suppressed.',
          },
        },
      });

      if (updateResult.count === 0) {
        wasConcurrentlySettled = true;
        return;
      }

      await tx.auditLog.create({
        data: {
          actorUserId: auditActorUserId,
          action: 'PAYMENT_OVERPAYMENT_RECORDED',
          entityType: 'Payment',
          entityId: payment.id,
          metadata: {
            invoiceId: lockedInvoice.id,
            paymentId: payment.id,
            orderId: orderId || payment.providerRef || null,
            providerPaymentId,
            reconciliationStatus: 'NEEDS_REFUND_OR_CREDIT',
            refundDecisionOutstanding: true,
            actor: actorIdentity,
            note: 'Invoice already PAID. Genuine payment captured as secondary overpayment. Outstanding refund or credit decision required.',
          },
        },
      });

      isSecondaryOverpayment = true;
      return;
    }

    // C. Primary Settlement (Invoice is NOT already PAID)
    const updateResult = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        providerRef: payment.providerRef || orderId || undefined,
        reference: providerPaymentId,
        provider,
        verifiedById: resolvedVerifiedById,
        metadata: {
          ...(metadata || {}),
          settlementRole: 'PRIMARY_SETTLEMENT',
          actor: actorIdentity,
          automatedVerification: !resolvedVerifiedById,
        },
      },
    });

    if (updateResult.count === 0) {
      wasConcurrentlySettled = true;
      return;
    }

    // Finalize Invoice: Generate official invoice number exactly once and mark PAID
    const now = new Date();
    let officialInvoiceNumber = lockedInvoice.invoiceNumber;
    if (!officialInvoiceNumber) {
      officialInvoiceNumber = await DocumentSequenceService.generateInvoiceNumber(now, tx);
    }

    const customerName = lockedInvoice.customerName || payment.user?.name || 'Member';
    const customerEmail = lockedInvoice.customerEmail || payment.user?.email || '';
    const customerAddress = lockedInvoice.customerAddress || payment.user?.memberProfile?.serviceAddress || '';
    const customerPhone = lockedInvoice.customerPhone || payment.user?.memberProfile?.mobileNumber || '';

    await tx.invoice.update({
      where: { id: lockedInvoice.id },
      data: {
        status: 'ISSUED',
        paymentStatus: 'PAID',
        paidDate: now,
        issueDate: lockedInvoice.status === 'DRAFT' ? now : lockedInvoice.issueDate,
        invoiceNumber: officialInvoiceNumber,
        customerName,
        customerEmail,
        customerAddress,
        customerPhone,
      },
    });

    // Generate Single Receipt
    const receiptNumber = await DocumentSequenceService.generateReceiptNumber(now, tx);
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
        paymentMethod: provider === 'RAZORPAY' ? 'ONLINE' : payment.paymentMethod,
        paymentReference: providerPaymentId,
        paymentDate: now,
        relatedPlanName:
          payment.renewalRequest?.planName ||
          payment.renewalRequest?.carePlan?.name ||
          payment.invoice?.lineItems?.[0]?.planName ||
          'Membership Care Plan',
      },
    });

    // Membership / Subscription Lifecycle Transition
    if (payment.renewalRequest) {
      const renewal = payment.renewalRequest;
      const isFuture = renewal.requestedStartDate > now;

      const newSub = await tx.subscription.create({
        data: {
          userId: renewal.userId,
          carePlanId: renewal.carePlanId,
          variantType: renewal.variantType,
          durationMonths: renewal.durationMonths,
          startDate: renewal.requestedStartDate,
          endDate: renewal.calculatedEndDate,
          status: isFuture ? 'SCHEDULED' : 'ACTIVE',
        },
      });
      createdSubscriptionId = newSub.id;

      if (renewal.addOns && renewal.addOns.length > 0) {
        await tx.subscriptionAddOn.createMany({
          data: renewal.addOns.map((addon: any) => ({
            subscriptionId: newSub.id,
            addOnId: addon.addOnId,
          })),
        });
      }

      // Expire prior active subscription to prevent overlapping active memberships
      if (renewal.currentSubscriptionId && !isFuture) {
        await tx.subscription.updateMany({
          where: {
            id: renewal.currentSubscriptionId,
            status: { not: 'EXPIRED' },
          },
          data: {
            status: 'EXPIRED',
            endDate: now,
          },
        });
      }

      // Complete Renewal Request
      await tx.renewalRequest.update({
        where: { id: renewal.id },
        data: { status: 'COMPLETED' },
      });

      // Audit Log for Primary Settlement
      await tx.auditLog.create({
        data: {
          actorUserId: auditActorUserId,
          action: 'PAYMENT_VERIFIED',
          entityType: 'Payment',
          entityId: payment.id,
          metadata: {
            invoiceId: lockedInvoice.id,
            subscriptionId: newSub.id,
            providerPaymentId,
            orderId,
            provider,
            actor: actorIdentity,
            settlementRole: 'PRIMARY_SETTLEMENT',
          },
        },
      });
    } else if (lockedInvoice.planId) {
      // Direct plan subscription purchase (outside renewal workflow)
      const durationMonths = 1;
      const calculatedEndDate = calculateEndDate(now, durationMonths);

      // Check if planId matches a CarePlan or legacy Plan
      const carePlan = await tx.carePlan.findFirst({
        where: { OR: [{ id: lockedInvoice.planId }, { slug: lockedInvoice.planId }] },
      });

      let legacyPlanId: string | null = null;
      if (!carePlan && lockedInvoice.planId) {
        const legacyPlan = await tx.plan.findUnique({
          where: { id: lockedInvoice.planId },
        });
        legacyPlanId = legacyPlan?.id || null;
      }

      const newSub = await tx.subscription.create({
        data: {
          userId: payment.userId,
          carePlanId: carePlan?.id || null,
          planId: legacyPlanId,
          durationMonths,
          startDate: now,
          endDate: calculatedEndDate,
          status: 'ACTIVE',
        },
      });
      createdSubscriptionId = newSub.id;

      await tx.auditLog.create({
        data: {
          actorUserId: auditActorUserId,
          action: 'PAYMENT_VERIFIED',
          entityType: 'Payment',
          entityId: payment.id,
          metadata: {
            invoiceId: lockedInvoice.id,
            subscriptionId: newSub.id,
            providerPaymentId,
            orderId,
            provider,
            actor: actorIdentity,
            settlementRole: 'PRIMARY_SETTLEMENT',
          },
        },
      });
    }
  });

  if (wasConcurrentlySettled) {
    return {
      success: true,
      alreadyVerified: true,
      paymentId: payment.id,
      invoiceId: targetInvoiceId,
    };
  }

  if (isSecondaryOverpayment) {
    return {
      success: true,
      alreadyVerified: false,
      isOverpayment: true,
      paymentId: payment.id,
      invoiceId: targetInvoiceId,
    };
  }

  // 5. Fire asynchronous notifications outside of $transaction (primary settlement only)
  if (payment.renewalRequest) {
    const updatedSub = await db.subscription.findFirst({
      where: { userId: payment.userId },
      include: { addOns: { include: { addOn: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (updatedSub) {
      notificationService
        .onPaymentVerified(payment, {
          status: updatedSub.status,
          startDate: updatedSub.startDate,
          endDate: updatedSub.endDate,
          carePlanId: updatedSub.carePlanId,
          variantType: updatedSub.variantType,
          durationMonths: updatedSub.durationMonths,
          addOns: updatedSub.addOns,
        })
        .catch((e) => console.error('Notification dispatch error:', e));
    }
  }

  return {
    success: true,
    alreadyVerified: false,
    paymentId: payment.id,
    invoiceId: targetInvoiceId,
    subscriptionId: createdSubscriptionId,
  };
}
