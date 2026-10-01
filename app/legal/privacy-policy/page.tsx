import { Metadata } from 'next'
import { Eyebrow } from '@/components/yoga/ornaments'

export const metadata: Metadata = {
  title: 'Privacy Policy | Sunshine Elder Care',
  description: 'Privacy Policy for Sunshine Elder Care services.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="bg-white p-8 sm:p-16 rounded-[2rem] shadow-xl border border-gold/20">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 text-4xl font-display font-bold text-maroon mb-12">
            Privacy Policy
          </h1>

          <div className="prose prose-lg prose-headings:font-display prose-headings:text-maroon prose-p:font-serif prose-p:text-foreground/80 max-w-none">
            
            <p className="text-sm font-sans text-foreground/50 mb-8 border-b border-gold/30 pb-4">
              Last Updated: [DATE TO BE SUPPLIED BY LEGAL COUNSEL]
              <br/>
              <span className="font-bold text-red-600 mt-2 inline-block">DRAFT FOR LAWYER REVIEW</span>
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Detail the types of personal data collected, including health/medical information, financial data, and contact details of both the elderly members and their sponsors/family.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Explain how data is used to provide care, coordinate with medical professionals, and process payments.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Data Sharing and Disclosure</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Specify conditions under which data is shared with third parties, such as hospitals, doctors, and payment gateways.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Describe the technical and organizational measures taken to protect sensitive health data.]
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-sans mb-4">
                [CONTENT TO BE SUPPLIED BY LEGAL COUNSEL: Outline user rights regarding data access, deletion, and modification according to applicable local laws.]
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Contact Information</h2>
              <p>
                For privacy-related inquiries, please contact our Data Protection Officer at:
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
