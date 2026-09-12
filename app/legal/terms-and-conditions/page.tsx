import { Metadata } from 'next'
import { Eyebrow } from '@/components/yoga/ornaments'

export const metadata: Metadata = {
  title: 'Terms and Conditions | Sunshine Elder Care',
  description: 'Terms and Conditions for Sunshine Elder Care services.',
}

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="bg-white p-8 sm:p-16 rounded-[2rem] shadow-xl border border-gold/20">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 text-4xl font-display font-bold text-maroon mb-12">
            Terms and Conditions
          </h1>

          <div className="prose prose-lg prose-headings:font-display prose-headings:text-maroon prose-p:font-serif prose-p:text-foreground/80 max-w-none">
            
            <p className="text-sm font-sans text-foreground/50 mb-8 border-b border-gold/30 pb-4">
              Last Updated: [DATE TO BE SUPPLIED BY LEGAL COUNSEL]
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Define how users accept these terms by using the service or website.]
              </div>
              <p>
                By accessing and using Sunshine Elder Care&apos;s website and services, you agree to be bound by these Terms and Conditions...
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. Description of Services</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Clearly delineate the scope of medical vs non-medical services provided under TrueCare, ERC, and Pulse Care+.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Membership and Payments</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Outline billing cycles, auto-renewal terms, refund policies, and cancellation procedures.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Limitation of Liability</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Essential disclaimers regarding medical emergencies and liability limitations.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">5. Governing Law</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Specify the jurisdiction (e.g., Kolkata, West Bengal, India) that governs these terms.]
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Contact Information</h2>
              <p>
                For any questions regarding these Terms, please contact us at:
              </p>
              <ul className="mt-4 space-y-2">
                <li>Email: admin@sunshineeldercare.com</li>
                <li>Phone: +91 81003 11142</li>
                <li>Address: Kolkata, West Bengal, India</li>
              </ul>
            </section>

          </div>
        </div>
      </div>
    </main>
  )
}