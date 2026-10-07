'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface RazorpayClientProps {
  orderId: string
  keyId: string
  amount: number
  currency: string
  name: string
  description: string
  customerName: string
  customerEmail: string
  customerPhone: string
  successUrl: string
  cancelUrl: string
}

export function RazorpayClient(props: RazorpayClientProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setIsLoaded(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handlePayment = () => {
    // @ts-ignore
    if (!isLoaded || !window.Razorpay) {
      alert('Payment gateway is still loading. Please try again in a moment.')
      return
    }

    const options = {
      key: props.keyId,
      amount: props.amount,
      currency: props.currency,
      name: props.name,
      description: props.description,
      order_id: props.orderId,
      handler: function (response: any) {
        // We do not trust the client here. The actual verification happens via the webhook.
        // We just redirect the user to success UI. The backend will verify asynchronously.
        // But some systems prefer synchronous verification. Let's redirect to success.
        router.push(props.successUrl)
      },
      prefill: {
        name: props.customerName,
        email: props.customerEmail,
        contact: props.customerPhone
      },
      theme: {
        color: '#6e0b24' // Maroon brand color
      },
      modal: {
        ondismiss: function () {
          router.push(props.cancelUrl)
        }
      }
    }

    // @ts-ignore
    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', function (response: any) {
      alert(`Payment Failed: ${response.error.description}`)
    })
    rzp.open()
  }

  return (
    <button
      onClick={handlePayment}
      disabled={!isLoaded}
      className="w-full rounded-xl bg-[#6e0b24] px-6 py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-md disabled:opacity-50"
    >
      {isLoaded ? 'Pay Now with Razorpay' : 'Loading Payment Gateway...'}
    </button>
  )
}
