import crypto from 'crypto';
import { PaymentProviderAdapter, PaymentCheckoutResponse } from './index';

export class RazorpayPaymentAdapter implements PaymentProviderAdapter {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials are not configured in environment variables.");
    }
    
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret || "";
  }

  async createCheckoutSession(request: any): Promise<PaymentCheckoutResponse> {
    // request has { amount, currency, invoiceId, userId, successUrl, cancelUrl, ... }
    
    // Razorpay requires amount in smallest unit (paise)
    const amountInPaise = Math.round(Number(request.amount) * 100);

    const orderPayload = {
      amount: amountInPaise,
      currency: request.currency || 'INR',
      receipt: request.invoiceId, // internal mapping
      notes: {
        invoiceId: request.invoiceId,
        userId: request.userId,
        renewalRequestId: request.renewalRequestId || ""
      }
    };

    const authString = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Razorpay] Order creation failed:', errorText);
      throw new Error('Failed to create Razorpay Order.');
    }

    const order = await response.json();

    // Instead of a direct hosted checkout URL, we route to a dedicated Next.js page 
    // that loads the Razorpay JS script and mounts the widget with this orderId.
    return {
      checkoutUrl: `/checkout/razorpay?orderId=${order.id}&invoiceId=${request.invoiceId}`,
      providerOrderId: order.id
    };
  }

  async verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
    if (!signature || !payload) return false;
    
    // Ensure we are using the correct secret for webhook signature
    const secretToUse = secret || this.webhookSecret;
    if (!secretToUse) {
      console.error('[Razorpay] Webhook secret not configured.');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secretToUse)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (e) {
      console.error('[Razorpay] Signature verification error:', e);
      return false;
    }
  }
}
