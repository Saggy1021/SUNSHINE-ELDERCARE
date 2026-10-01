import { Metadata } from 'next'
import { Eyebrow } from '@/components/yoga/ornaments'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Sunshine Elder Care',
  description: 'Refund & Cancellation Policy for Sunshine Elder Care services.',
}

export default function RefundCancellationPage() {
  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="bg-white p-8 sm:p-16 rounded-[2rem] shadow-xl border border-gold/20">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 text-4xl font-display font-bold text-maroon mb-12">
            Refund & Cancellation Policy
          </h1>

          <div className="prose prose-lg prose-headings:font-display prose-headings:text-maroon prose-p:font-serif prose-p:text-foreground/80 max-w-none">
            
            <p className="text-sm font-sans text-foreground/50 mb-8 border-b border-gold/30 pb-4">
              Last Updated: [DATE TO BE SUPPLIED BY LEGAL COUNSEL]
              <br/>
              <span className="font-bold text-red-600 mt-2 inline-block">DRAFT FOR LAWYER REVIEW</span>
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Cancellation Policy</h2>
              <p>
                Memberships can be cancelled subject to the applicable company administrative terms. Detailed cancellation conditions will be provided by company administration.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. Refund Eligibility & Amount</h2>
              <p>
                Refund amounts depend on applicable company administrative terms. The treatment of used services and any administrative charges will be determined by company administration.
              </p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4 mt-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Provide the detailed cancellation matrix and administrative fee percentages once finalized.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Death or Medical Incapacity</h2>
              <p>
                In cases of death or severe medical incapacity, please contact company administration for specific assistance and refund handling.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Refund Processing Time</h2>
              <p>
                Approved refunds will be processed within 7 DAYS of approval.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Contact Information</h2>
              <p>
                For questions about cancellations or refunds, please contact us at:
              </p>
              <ul className="mt-4 space-y-2">
                <li>Email: INFO.SUNSHINEELDERCARE@GMAIL.COM</li>
                <li>Address: 1/67 NAKTALA, N.S.C BOSE ROAD, KOLKATA - 700047, WEST BENGAL, INDIA</li>
              </ul>
            </section>

          </div>
        </div>
      </div>
    </main>
  )
}
