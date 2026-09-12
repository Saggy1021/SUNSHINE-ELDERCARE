import { db } from '@/lib/db'

export interface PaymentCheckoutRequest {
  invoiceId: string;
  userId: string;
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
      checkoutUrl: `/checkout/mock-success?orderId=mock_${Date.now()}`,
      providerOrderId: `mock_order_${Date.now()}`
    };
  }

  async verifyWebhook(payload: any, signature: string, secret: string): Promise<boolean> {
    console.log('[MockPayment] Verifying webhook');
    return true;
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

    return this.adapter.createCheckoutSession(adapterRequest);
  }

  async verifyWebhook(payload: any, signature: string, secret: string): Promise<boolean> {
    return this.adapter.verifyWebhook(payload, signature, secret);
  }
}

export const paymentService = new PaymentService();
