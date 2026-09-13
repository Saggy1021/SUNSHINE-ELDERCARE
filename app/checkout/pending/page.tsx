import { Reveal } from '@/components/yoga/reveal'
import { Eyebrow } from '@/components/yoga/ornaments'
import Link from 'next/link'

export default function CheckoutPendingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center pt-24 pb-20">
      <div className="mx-auto max-w-md px-5 text-center">
        <Reveal>
          <Eyebrow>Payment Configuration</Eyebrow>
          <h1 className="mt-4 font-display text-4xl font-bold">Online Payment Pending</h1>
          
          <div className="mt-8 rounded-2xl border border-gold/30 bg-card p-8 shadow-xl">
            <p className="text-foreground/80 font-medium">
              We are currently finalizing our online payment gateway integration.
            </p>
            <p className="mt-4 text-sm text-foreground/60">
              Your invoice has been securely saved and your selected plan is locked in. 
              Our team will contact you shortly with manual payment instructions, or you can check back later to complete your subscription online.
            </p>
            
            <Link
              href="/dashboard"
              className="mt-8 inline-block w-full rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-brown transition-opacity hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  )
}
