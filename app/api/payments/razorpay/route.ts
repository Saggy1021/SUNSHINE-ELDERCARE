import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { settleSuccessfulPayment } from '@/lib/services/payment/settlement';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let eventId = '';
  let eventType = '';
  let orderId: string | null = null;
  let paymentId: string | null = null;
  let rawBody = '';

  try {
    // 1. Extract signature and webhook secret
    const signature = req.headers.get('x-razorpay-signature') || '';
    const headerEventId = req.headers.get('x-razorpay-event-id');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';

    // Fail closed: Missing secret means webhook verification cannot proceed safely
    if (!secret) {
      console.error('[RazorpayWebhook] Secret configuration missing. Rejecting webhook.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    // 2. Read RAW request body as text BEFORE any JSON parsing
    rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    // 3. Cryptographic Signature Verification (HMAC SHA-256 with timing-safe comparison)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');

    const isValidSignature =
      expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isValidSignature) {
      console.warn('[RazorpayWebhook] Invalid signature received.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Parse the verified JSON payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    eventType = event.event || '';
    eventId = headerEventId || event.event_id || event.id || `evt_${Date.now()}`;

    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    paymentId = paymentEntity?.id || null;
    orderId = paymentEntity?.order_id || orderEntity?.id || null;
    const amountInPaise = paymentEntity?.amount || orderEntity?.amount;
    const currency = paymentEntity?.currency || orderEntity?.currency || 'INR';
    const notes = paymentEntity?.notes || orderEntity?.notes || {};
    const invoiceId = notes.invoiceId || null;

    // 5. Durable Event-Level Idempotency using Database Uniqueness Constraint
    let eventRecordCreated = false;
    try {
      await db.razorpayWebhookEvent.create({
        data: {
          eventId,
          eventType,
          orderId,
          paymentId,
          status: 'RECEIVED',
          payload: {
            event: eventType,
            orderId,
            paymentId,
            amount: amountInPaise,
            currency,
            createdAt: event.created_at,
          },
        },
      });
      eventRecordCreated = true;
    } catch (err: any) {
      // P2002 is Prisma's unique constraint violation code
      if (err?.code === 'P2002') {
        console.log(`[RazorpayWebhook] Duplicate event ${eventId} already received. Acknowledging with 200.`);
        return NextResponse.json({ received: true, note: 'Duplicate event already processed' }, { status: 200 });
      }
      // If table is not yet migrated in the active database, log warning and continue safely
      console.warn('[RazorpayWebhook] Notice: razorpayWebhookEvent write bypassed:', err?.message);
    }

    // Helper to update event log status safely
    const updateEventStatus = async (status: string, error?: string) => {
      if (!eventRecordCreated) return;
      try {
        await db.razorpayWebhookEvent.update({
          where: { eventId },
          data: {
            status,
            error: error || null,
            processedAt: new Date(),
          },
        });
      } catch {
        // Non-blocking
      }
    };

    // 6. Handle Specific Event Types
    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        // Validate presence of payment or order identifier
        if (!paymentId && !orderId) {
          await updateEventStatus('FAILED', 'Missing paymentId and orderId in captured/paid payload');
          return NextResponse.json({ error: 'Missing paymentId and orderId' }, { status: 400 });
        }

        const settlementResult = await settleSuccessfulPayment({
          orderId: orderId || undefined,
          paymentId: undefined, // Let correlation match on orderId or invoiceId
          invoiceId: invoiceId || undefined,
          providerPaymentId: paymentId || `order_paid_${orderId}`,
          provider: 'RAZORPAY',
          amountInPaise,
          currency,
          verifiedById: null,
          metadata: {
            eventId,
            eventType,
            orderId,
            paymentId,
            actor: 'RAZORPAY_WEBHOOK',
            method: paymentEntity?.method,
            vpa: paymentEntity?.vpa,
            bank: paymentEntity?.bank,
            wallet: paymentEntity?.wallet,
          },
        });

        if (!settlementResult.success) {
          if (settlementResult.error === 'PAYMENT_CONTEXT_NOT_FOUND') {
            console.warn(`[RazorpayWebhook] Payment context not found for order ${orderId}, invoice ${invoiceId}.`);
            await updateEventStatus('PENDING_RETRY', 'Payment context not found');
            // Return 404 so Razorpay will retry in case internal order creation was slightly delayed
            return NextResponse.json({ error: 'Payment context not found' }, { status: 404 });
          }
          await updateEventStatus('FAILED', settlementResult.error);
          return NextResponse.json({ error: settlementResult.error }, { status: 400 });
        }

        await updateEventStatus('PROCESSED');
        return NextResponse.json({
          received: true,
          status: settlementResult.alreadyVerified ? 'already_verified' : 'settled',
        });
      }

      case 'payment.failed': {
        // Out-of-order and failure safety:
        // A failed event must NEVER downgrade a confirmed payment or cancel an active membership!
        if (orderId || paymentId || invoiceId) {
          const existingPayment = await db.payment.findFirst({
            where: {
              OR: [
                orderId ? { providerRef: orderId } : undefined,
                orderId ? { reference: orderId } : undefined,
                paymentId ? { reference: paymentId } : undefined,
                invoiceId ? { invoiceId } : undefined,
              ].filter(Boolean) as any,
            },
          });

          if (existingPayment) {
            if (existingPayment.status === 'VERIFIED') {
              console.log(
                `[RazorpayWebhook] Received payment.failed for already VERIFIED payment ${existingPayment.id}. Ignoring to prevent downgrade.`
              );
              await updateEventStatus('IGNORED', 'Payment already verified, failed attempt ignored');
              return NextResponse.json({ received: true, note: 'Payment already verified' });
            }

            // If still pending, log failure notes safely
            const failureReason = paymentEntity?.error_description || 'Payment failed';
            await db.payment.update({
              where: { id: existingPayment.id },
              data: {
                notes: `Razorpay failure (${paymentEntity?.error_code || 'ERROR'}): ${failureReason}`,
              },
            });
          }
        }

        await updateEventStatus('PROCESSED');
        return NextResponse.json({ received: true, note: 'Payment failure recorded' });
      }

      default: {
        // Safely acknowledge unhandled events without processing
        console.log(`[RazorpayWebhook] Unhandled event type: ${eventType}`);
        await updateEventStatus('IGNORED', `Unhandled event type: ${eventType}`);
        return NextResponse.json({ received: true, note: 'Unhandled event acknowledged' });
      }
    }
  } catch (error: any) {
    console.error('[RazorpayWebhook] Internal error during processing:', error);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
