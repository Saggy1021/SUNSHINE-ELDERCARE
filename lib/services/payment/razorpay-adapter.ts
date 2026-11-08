import crypto from 'node:crypto';
import type { PaymentCheckoutRequest, PaymentCheckoutResponse, PaymentProviderAdapter } from './index';

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayPaymentEntity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  notes: Record<string, any>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
}

export class RazorpayAdapter implements PaymentProviderAdapter {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private apiBaseUrl: string = 'https://api.razorpay.com/v1';

  constructor(options?: { keyId?: string; keySecret?: string; webhookSecret?: string; apiBaseUrl?: string }) {
    this.keyId =
      options?.keyId !== undefined
        ? options.keyId
        : process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_PUBLIC_KEY || '';
    this.keySecret =
      options?.keySecret !== undefined
        ? options.keySecret
        : process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_SECRET_KEY || '';
    this.webhookSecret =
      options?.webhookSecret !== undefined
        ? options.webhookSecret
        : process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';
    if (options?.apiBaseUrl) {
      this.apiBaseUrl = options.apiBaseUrl;
    }

    // Fail closed: Do NOT proceed if credentials are missing
    if (!this.keyId || !this.keySecret) {
      throw new Error(
        'Razorpay configuration missing: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set. Failing closed.'
      );
    }
  }

  public getKeyId(): string {
    return this.keyId;
  }

  private getAuthHeader(): string {
    const credentials = `${this.keyId}:${this.keySecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Creates an order with Razorpay Orders API using authoritative integer paise amounts.
   */
  async createCheckoutSession(
    request: PaymentCheckoutRequest & { amount: number | any; currency?: string }
  ): Promise<PaymentCheckoutResponse> {
    const rawAmount =
      typeof request.amount === 'object' && request.amount !== null && typeof request.amount.toNumber === 'function'
        ? request.amount.toNumber()
        : Number(request.amount);
    if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
      throw new Error(`Invalid order amount: ${request.amount}. Must be greater than 0.`);
    }

    // Convert authoritative total to integer paise
    const amountInPaise = Math.round(rawAmount * 100);
    if (amountInPaise < 100) {
      throw new Error(`Order amount in paise (${amountInPaise}) is below the Razorpay minimum (100 paise / ₹1).`);
    }

    const currency = (request.currency || 'INR').toUpperCase();
    if (currency !== 'INR') {
      throw new Error(`Unsupported currency: ${currency}. Only INR is currently supported for domestic memberships.`);
    }

    const receipt = (request.invoiceId || `rec_${Date.now()}`).slice(0, 40);

    const payload = {
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        invoiceId: request.invoiceId,
        userId: request.userId,
        renewalRequestId: request.renewalRequestId || '',
      },
    };

    const response = await fetch(`${this.apiBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorBody = 'Unknown Razorpay error';
      try {
        const errJson = await response.json();
        errorBody = errJson?.error?.description || JSON.stringify(errJson);
      } catch {
        errorBody = await response.text();
      }
      throw new Error(`Razorpay Orders API failed (${response.status}): ${errorBody}`);
    }

    const order: RazorpayOrderResponse = await response.json();

    return {
      checkoutUrl: `/checkout/${request.invoiceId}?orderId=${order.id}`,
      providerOrderId: order.id,
      keyId: this.keyId,
      amount: amountInPaise,
      currency,
    };
  }

  /**
   * Verifies Razorpay Checkout modal signature:
   * HMAC-SHA256(order_id + "|" + payment_id, key_secret) === razorpay_signature
   */
  verifyCheckoutSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    if (!params.orderId || !params.paymentId || !params.signature) {
      return false;
    }

    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(text)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(params.signature, 'utf8');

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }

  /**
   * Verifies Razorpay Webhook signature:
   * HMAC-SHA256(raw_request_body, webhook_secret) === x-razorpay-signature
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secretOverride?: string): boolean {
    const secret = secretOverride || this.webhookSecret;
    if (!secret) {
      throw new Error('Razorpay webhook secret not configured. Failing closed.');
    }

    if (!signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }

  /**
   * Adapter interface compliance method
   */
  async verifyWebhook(payload: any, signature: string, secret: string): Promise<boolean> {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return this.verifyWebhookSignature(rawBody, signature, secret);
  }

  /**
   * Fetches payment details directly from Razorpay for server-side reconciliation.
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPaymentEntity> {
    if (!paymentId) throw new Error('paymentId is required');

    const response = await fetch(`${this.apiBaseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      let errDesc = 'Failed to fetch payment';
      try {
        const errJson = await response.json();
        errDesc = errJson?.error?.description || JSON.stringify(errJson);
      } catch {
        errDesc = await response.text();
      }
      throw new Error(`Razorpay fetch payment error (${response.status}): ${errDesc}`);
    }

    return response.json();
  }

  /**
   * Fetches order details directly from Razorpay for server-side reconciliation.
   */
  async fetchOrder(orderId: string): Promise<RazorpayOrderResponse> {
    if (!orderId) throw new Error('orderId is required');

    const response = await fetch(`${this.apiBaseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      let errDesc = 'Failed to fetch order';
      try {
        const errJson = await response.json();
        errDesc = errJson?.error?.description || JSON.stringify(errJson);
      } catch {
        errDesc = await response.text();
      }
      throw new Error(`Razorpay fetch order error (${response.status}): ${errDesc}`);
    }

    return response.json();
  }
}

/**
 * Standalone constant-time checkout signature verification helper
 */
export function verifyRazorpayCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret?: string;
}): boolean {
  const secret = params.keySecret || process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_SECRET_KEY || '';
  if (!secret || !params.orderId || !params.paymentId || !params.signature) {
    return false;
  }

  const text = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(params.signature, 'utf8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Standalone constant-time webhook signature verification helper
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secretOverride?: string
): boolean {
  const secret =
    secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';
  if (!secret || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
