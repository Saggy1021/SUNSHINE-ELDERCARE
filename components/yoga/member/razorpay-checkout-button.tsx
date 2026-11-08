'use client';

import { useState } from 'react';
import { createRazorpayOrderAction, verifyRazorpayCheckoutAction } from '@/app/actions/checkout';

interface RazorpayCheckoutButtonProps {
  invoiceId: string;
  renewalId?: string;
  amountFormatted: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({
  invoiceId,
  renewalId,
  amountFormatted,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Authoritative server-side order creation
      const res = await createRazorpayOrderAction(invoiceId, renewalId);
      if (!res.success || !res.orderId) {
        setError(res.error || 'Failed to initiate payment order.');
        setLoading(false);
        return;
      }

      // 2. Load SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        setError('Unable to load payment gateway SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Configure Razorpay modal
      const options = {
        key: res.keyId,
        amount: res.amount,
        currency: res.currency,
        name: 'Sunshine Eldercare',
        description: `Payment for Invoice #${res.invoiceReference}`,
        order_id: res.orderId,
        prefill: {
          name: res.customer.name,
          email: res.customer.email,
          contact: res.customer.contact,
        },
        theme: {
          color: '#B08A4A',
        },
        handler: async function (response: any) {
          setVerifying(true);
          try {
            const verifyRes = await verifyRazorpayCheckoutAction({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId,
            });

            if (verifyRes.success) {
              window.location.href = '/dashboard?payment=verified';
            } else {
              setError(verifyRes.error || 'Payment verification failed.');
              setVerifying(false);
              setLoading(false);
            }
          } catch (e: any) {
            setError(e.message || 'Payment verification error.');
            setVerifying(false);
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.warn('Payment failed:', resp.error);
        setError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Payment launch error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={loading || verifying}
        onClick={handlePayment}
        className="w-full rounded-xl bg-gold px-6 py-3.5 text-center text-sm font-bold text-brown transition-all hover:opacity-95 shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {verifying ? (
          <>
            <span className="inline-block animate-spin h-4 w-4 border-2 border-brown border-t-transparent rounded-full" />
            <span>Verifying Payment...</span>
          </>
        ) : loading ? (
          <>
            <span className="inline-block animate-spin h-4 w-4 border-2 border-brown border-t-transparent rounded-full" />
            <span>Opening Razorpay...</span>
          </>
        ) : (
          <span>Pay Online with Razorpay ({amountFormatted})</span>
        )}
      </button>
    </div>
  );
}
