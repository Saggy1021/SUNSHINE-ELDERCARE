import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment';
import { settleSuccessfulPayment } from '@/lib/services/payment/settlement';

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
      if (!internalInvoiceId && !providerPaymentId) {
        return NextResponse.json({ error: 'Missing payment context identifiers' }, { status: 400 });
      }

      // Delegate to shared, concurrency-hardened settlement engine
      // Enforces canonical lock ordering: Invoice (FOR UPDATE) -> Payment -> remaining records
      const settlementResult = await settleSuccessfulPayment({
        invoiceId: internalInvoiceId,
        providerPaymentId: providerPaymentId || `generic_${Date.now()}`,
        provider: 'GENERIC_WEBHOOK',
        verifiedById: null,
        metadata: {
          eventType,
          providerPaymentId,
          payload,
          actor: 'SYSTEM_WEBHOOK',
        },
      });

      if (!settlementResult.success) {
        if (settlementResult.error === 'PAYMENT_CONTEXT_NOT_FOUND') {
          return NextResponse.json({ error: 'Payment context not found' }, { status: 404 });
        }
        return NextResponse.json({ error: settlementResult.error }, { status: 400 });
      }

      return NextResponse.json({
        received: true,
        status: settlementResult.alreadyVerified ? 'already_verified' : 'settled',
      });
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
