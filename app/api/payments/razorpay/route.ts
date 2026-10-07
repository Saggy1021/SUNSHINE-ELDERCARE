import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment';
import { systemVerifyPayment } from '@/lib/services/payment/index';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const payloadString = await req.text();
    
    // Use the native webhook verification logic
    const isValid = await paymentService.verifyWebhook(
      payloadString, 
      signature, 
      process.env.RAZORPAY_WEBHOOK_SECRET || ''
    );

    if (!isValid) {
      console.error('[Razorpay Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(payloadString);
    const event = payload.event;

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      
      try {
        const payment = await db.payment.findFirst({ where: { reference: orderId } });
        
        if (!payment) {
          // It's possible the payment is already verified and the reference was overwritten
          // Or the order doesn't exist.
          console.error('[Razorpay Webhook] Payment not found for order', orderId);
          return NextResponse.json({ status: 'ok' });
        }

        // Trigger system verification, which handles idempotency and lifecycle
        await systemVerifyPayment(payment.id, paymentId);
        console.log(`[Razorpay Webhook] Successfully processed payment ${paymentId} for order ${orderId}`);
      } catch (err: any) {
        // If it's just an idempotency skip, it might just return or throw a specific error, 
        // but we should still return 200 so Razorpay stops retrying.
        if (err.message.includes('not found')) {
           console.error('[Razorpay Webhook] Order not found or already verified', err.message);
        } else {
           console.error('[Razorpay Webhook] Verification error:', err);
           // Depending on business logic, we might return 500 to trigger retry, 
           // but often it's better to log and return 200 to acknowledge receipt.
           return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[Razorpay Webhook] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
