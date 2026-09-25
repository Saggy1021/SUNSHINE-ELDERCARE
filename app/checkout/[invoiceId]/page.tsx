import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { Reveal } from '@/components/yoga/reveal'
import { Eyebrow } from '@/components/yoga/ornaments'
import Link from 'next/link'
import { initiatePaymentAction } from '@/app/actions/checkout'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ invoiceId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function formatINR(amount: any): string {
  if (amount === null || amount === undefined) return '—'
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export default async function InvoiceReviewPage({ params, searchParams }: Props) {
  const { invoiceId } = await params
  const { renewal } = await searchParams
  const renewalId = typeof renewal === 'string' ? renewal : ''
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout/${invoiceId}`)}`)
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true }
  })

  if (!invoice) notFound()

  // Strict ownership check
  if (invoice.userId !== session.user.id && session.user.role !== 'ADMIN') {
    notFound()
  }

  // Redirect if already paid
  if (invoice.status === 'PAID') {
    redirect('/dashboard') // Or success page
  }

  const item = invoice.lineItems[0]

  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <Reveal>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-gold transition-colors mb-8"
            >
              ← Back to Membership
            </Link>
            <Eyebrow>Order Review</Eyebrow>
            <h1 className="mt-4 font-display text-4xl font-bold">Review Your Subscription</h1>
            <p className="mt-2 text-foreground/70">Please review your invoice details before proceeding to payment.</p>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-10 rounded-2xl border border-gold/30 bg-card shadow-xl overflow-hidden">
              <div className="bg-gold/10 p-6 border-b border-gold/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-sm text-foreground/60 uppercase tracking-wider font-semibold">Invoice Number</p>
                    <p className="font-display text-xl font-bold">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-foreground/60 uppercase tracking-wider font-semibold">Status</p>
                    <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 border border-orange-200 mt-1">
                      {invoice.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-semibold text-lg border-b border-border pb-2 mb-4">Package Details</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div className="text-foreground/60">Plan Name</div>
                    <div className="font-medium text-right">{item?.planName || '—'}</div>
                    
                    <div className="text-foreground/60">Variant</div>
                    <div className="font-medium text-right capitalize">{item?.variantType?.toLowerCase() || '—'}</div>
                    
                    <div className="text-foreground/60">Duration</div>
                    <div className="font-medium text-right">{item?.durationMonths} Month{item?.durationMonths !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg border-b border-border pb-2 mb-4">Pricing</h3>
                  <div className="space-y-3 text-sm">
                    {/* For 1 month package, we have subtotal and tax. For multi-month, they are null */}
                    {invoice.subtotal !== null && invoice.taxAmount !== null && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Base Price</span>
                          <span className="font-medium">{formatINR(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">GST (18%)</span>
                          <span className="font-medium">{formatINR(invoice.taxAmount)}</span>
                        </div>
                      </>
                    )}
                    
                    {item?.discountNote && (
                      <div className="flex justify-between text-gold">
                        <span className="text-sm">{item.discountNote}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between border-t border-border pt-3 mt-3">
                      <span className="font-bold text-lg">Total Amount</span>
                      <span className="font-display font-bold text-2xl">{formatINR(invoice.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  
                  {/* Online Payment (Mock or configured provider) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-2">Online Payment</h4>
                    <form action={initiatePaymentAction}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <button 
                        type="submit"
                        className="w-full rounded-xl bg-gold px-6 py-3 text-center text-sm font-bold text-brown transition-opacity hover:opacity-90 shadow-sm"
                      >
                        Pay Online Now
                      </button>
                    </form>
                  </div>

                  {/* Offline Payment */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Offline Transfer (NEFT/RTGS)</h4>
                    <p className="text-xs text-slate-600 mb-4">
                      Transfer the amount to our bank account and provide the UTR/Reference number below. 
                      Your membership will be activated after admin verification.
                    </p>
                    <form action={async (formData) => {
                      "use server"
                      const { processOfflinePayment } = await import('@/app/actions/payment')
                      
                      const ref = formData.get("reference") as string
                      const reqId = formData.get("renewalId") as string
                      const invId = formData.get("invoiceId") as string
                      const amt = Number(formData.get("amount"))
                      
                      if (reqId && invId && amt) {
                        await processOfflinePayment(invId, reqId, amt, ref)
                      }
                    }} className="space-y-3">
                      <input type="hidden" name="renewalId" value={renewalId} />
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="amount" value={invoice.total.toString()} />
                      
                      <input 
                        type="text" 
                        name="reference" 
                        placeholder="Enter UTR or Reference Number" 
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                      <button 
                        type="submit"
                        className="w-full rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
                      >
                        Submit Verification Request
                      </button>
                    </form>
                  </div>

                  <p className="text-center text-xs text-foreground/50 mt-4">
                    By proceeding, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
