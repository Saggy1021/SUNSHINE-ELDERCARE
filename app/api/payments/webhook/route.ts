import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment';
import { db } from '@/lib/db';
import { DocumentSequenceService } from '@/lib/services/document-sequence';
import { notificationService } from '@/lib/services/notification';

export async function POST(req: Request) {
  try {
    // 1. Extract payload and signature
    const payload = await req.json(); // May need to be raw text depending on provider, but for abstract boundary this suffices
    const signature = req.headers.get('x-provider-signature') || '';
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 2. Verify authenticity via Provider Adapter
    const isValid = await paymentService.verifyWebhook(payload, signature, secret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Normalize Event (this logic will expand inside the adapter or here once provider is chosen)
    const eventType = payload.event_type; // Abstract representation
    const providerPaymentId = payload.payment_id;
    const internalInvoiceId = payload.metadata?.invoiceId;

    if (eventType === 'payment.captured' || eventType === 'payment.success') {
      
      // Look up the internal payment record if one was created during initiation, or just the invoice
      const payment = await db.payment.findFirst({
        where: { invoiceId: internalInvoiceId, status: "PENDING" },
        include: { 
          invoice: true, 
          renewalRequest: { include: { addOns: true, carePlan: true } },
          user: { include: { memberProfile: true } }
        }
      });

      if (!payment) {
        // If payment doesn't exist, this might be a spontaneous webhook. 
        // Real implementation will need to handle this (e.g., creating the payment record).
        return NextResponse.json({ error: 'Payment context not found' }, { status: 404 });
      }

      // Idempotency check: if already verified, acknowledge and ignore
      if (payment.status === 'VERIFIED') {
        return NextResponse.json({ received: true, note: 'Already verified' });
      }

      // 4. Transactional Settlement
      await db.$transaction(async (tx) => {
        // A. Concurrency Check & Update
        const updateResult = await tx.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            reference: providerPaymentId
          }
        });

        if (updateResult.count === 0) {
          // Already processed by another concurrent webhook
          return;
        }

        // B. Finalize Invoice
        const invoice = payment.invoice;
        if (!invoice) {
          throw new Error("Invoice not found for payment");
        }
        
        const now = new Date();
        // For legacy invoices where invoiceNumber is null, we intentionally do NOT fabricate
        // a new SEC sequence number to preserve historical records.
        let officialInvoiceNumber = invoice.invoiceNumber;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "ISSUED",
            paymentStatus: "PAID",
            paidDate: now,
            invoiceNumber: officialInvoiceNumber
          }
        });

        // C. Create Receipt
        const receiptNumber = await DocumentSequenceService.generateReceiptNumber(now, tx);
        await tx.receipt.create({
          data: {
            receiptNumber,
            invoiceId: invoice.id,
            paymentId: payment.id,
            userId: payment.userId,
            customerName: payment.user.name || "Member",
            customerEmail: payment.user.email,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: "ONLINE",
            paymentReference: providerPaymentId,
            paymentDate: now,
            relatedPlanName: payment.renewalRequest?.carePlan?.name || "Membership Plan"
          }
        });

        // D. Handle Subscription Lifecycle (if attached to a renewal request)
        if (payment.renewalRequest) {
          const isFuture = payment.renewalRequest.requestedStartDate > now;
          const newSubscription = await tx.subscription.create({
            data: {
              userId: payment.renewalRequest.userId,
              carePlanId: payment.renewalRequest.carePlanId,
              variantType: payment.renewalRequest.variantType,
              durationMonths: payment.renewalRequest.durationMonths,
              startDate: payment.renewalRequest.requestedStartDate,
              endDate: payment.renewalRequest.calculatedEndDate,
              status: isFuture ? "SCHEDULED" : "ACTIVE",
            }
          });

          await tx.renewalRequest.update({
            where: { id: payment.renewalRequest.id },
            data: { status: "COMPLETED" } 
          });

          await tx.auditLog.create({
            data: {
              actorUserId: "SYSTEM",
              action: "WEBHOOK_PAYMENT_VERIFIED",
              entityType: "Payment",
              entityId: payment.id,
              metadata: { invoiceId: invoice.id, subscriptionId: newSubscription.id }
            }
          });
        }
      });

      return NextResponse.json({ received: true });
    }

    if (eventType === 'payment.failed') {
      // Handle failure
      return NextResponse.json({ received: true });
    }

    // Acknowledge unhandled event types
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
