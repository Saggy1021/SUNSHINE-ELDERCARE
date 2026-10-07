import { Metadata } from 'next'
import { Eyebrow } from '@/components/yoga/ornaments'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Sunshine Eldercare',
  description: 'Refund & Cancellation Policy for Sunshine Eldercare services.',
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
              Effective Date: 08 October 2026<br/>
              Last Updated: 08 October 2026
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Cancellation of Services</h2>
              <p>
                A cancellation request must be submitted in writing through your registered email address to info.sunshineeldercare@gmail.com or via your official account-supported channel. The cancellation becomes effective once Sunshine Eldercare acknowledges and processes the request.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. Refund Processing and Eligibility</h2>
              <p>
                Service usage significantly affects refund eligibility. Services already delivered prior to cancellation may be factored into determining the refundable amount. The applicable subscription duration (Monthly, Quarterly, Half-Yearly, or Annual) determines which refund table applies to your cancellation. 
              </p>
              <p>
                Approved refunds are processed through the original payment method where supported by the payment gateway. The final time for a refund to appear in your account depends entirely on the payment gateway, bank, and payment provider involved in the transaction.
              </p>
              <p>
                Please note that no refund is available once the applicable "No refund" threshold time period is reached.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Refund Tables</h2>
              <p>The following authoritative refund structures apply to cancelled plans based on the time elapsed since plan activation:</p>
              
              <h3 className="text-xl font-bold mt-6 mb-2">Monthly Plan</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Up to 10 days:</strong> 60% refund</li>
                <li><strong>11–20 days:</strong> 30% refund</li>
                <li><strong>Beyond 20 days:</strong> No refund</li>
              </ul>

              <h3 className="text-xl font-bold mt-6 mb-2">Quarterly Plan</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Up to 15 days:</strong> 85% refund</li>
                <li><strong>16–30 days:</strong> 65% refund</li>
                <li><strong>31–60 days:</strong> 30% refund</li>
                <li><strong>Beyond 60 days:</strong> No refund</li>
              </ul>

              <h3 className="text-xl font-bold mt-6 mb-2">Half-Yearly Plan</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Up to 15 days:</strong> 85% refund</li>
                <li><strong>16–45 days:</strong> 70% refund</li>
                <li><strong>46–90 days:</strong> 50% refund</li>
                <li><strong>91–150 days:</strong> 20% refund</li>
                <li><strong>Beyond 150 days:</strong> No refund</li>
              </ul>

              <h3 className="text-xl font-bold mt-6 mb-2">Annual Plan</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Up to 30 days:</strong> 90% refund</li>
                <li><strong>31–90 days:</strong> 75% refund</li>
                <li><strong>91–180 days:</strong> 50% refund</li>
                <li><strong>181–270 days:</strong> 20% refund</li>
                <li><strong>Beyond 270 days:</strong> No refund</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Contact Information</h2>
              <p>
                For questions about cancellations or refunds, please contact us at:
              </p>
              <ul className="mt-4 space-y-2">
                <li><strong>Company:</strong> SUNSHINE ELDERCARE</li>
                <li><strong>Phone:</strong> 8582907723</li>
                <li><strong>Email:</strong> info.sunshineeldercare@gmail.com</li>
                <li><strong>Website:</strong> https://sunshineeldercare.in</li>
                <li><strong>Address:</strong> 1/67 Naktala, N.S.C Bose Road, Kolkata 700047, West Bengal, India</li>
              </ul>
            </section>

          </div>
        </div>
      </div>
    </main>
  )
}
