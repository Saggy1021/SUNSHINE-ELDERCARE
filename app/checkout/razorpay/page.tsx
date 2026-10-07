import { auth } from '@/auth'
import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { RazorpayClient } from './razorpay-client'

export const dynamic = 'force-dynamic'

export default async function RazorpayCheckoutPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth()
  const { orderId, invoiceId } = await searchParams
  
  if (!session?.user?.id) {
    redirect(`/login`)
  }

  if (typeof orderId !== 'string' || typeof invoiceId !== 'string') {
    notFound()
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { user: true, lineItems: true }
  })

  if (!invoice || (invoice.userId !== session.user.id && session.user.role !== 'ADMIN')) {
    notFound()
  }

  if (invoice.status === 'PAID') {
    redirect('/dashboard?success=true')
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) {
    throw new Error('Razorpay is not configured properly.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
        <p className="text-gray-500 text-sm mb-6">You are about to securely pay for Invoice #{invoice.invoiceNumber || invoice.referenceNumber}</p>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Plan</span>
            <span className="font-semibold text-slate-800">{invoice.lineItems[0]?.planName || 'Care Package'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Amount</span>
            <span className="font-bold text-slate-900 text-lg">₹{Number(invoice.total).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <RazorpayClient 
          orderId={orderId} 
          keyId={keyId}
          amount={Math.round(Number(invoice.total) * 100)}
          currency={invoice.currency}
          name="Sunshine Elder Care"
          description={`Payment for ${invoice.lineItems[0]?.planName || 'Invoice'}`}
          customerName={invoice.customerName || invoice.user.name || ''}
          customerEmail={invoice.customerEmail || invoice.user.email || ''}
          customerPhone={invoice.customerPhone || ''}
          successUrl="/dashboard?success=true"
          cancelUrl={`/checkout/${invoice.id}?canceled=true`}
        />
      </div>
    </main>
  )
}
