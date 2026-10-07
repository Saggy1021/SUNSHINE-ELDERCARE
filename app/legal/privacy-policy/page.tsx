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
              Effective Date: 08 October 2026<br/>
              Last Updated: 08 October 2026
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p>
                At Sunshine Elder Care, we respect your privacy and are committed to protecting the personal data of our members. This Privacy Policy explains what information we collect, why we collect it, how it is used, and how it is secured when you use our website (https://sunshineeldercare.in) and associated services.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. Identity, Account, and Contact Data</h2>
              <p>
                To provide our services, we collect necessary identity and contact data during registration and account setup, which includes: name, email address, mobile/contact number, date of birth, gender (where collected), residential address, contact/address information required for service delivery, and account authentication information.
              </p>
              <p>
                As part of identity proof verification, we accept uploads of Voter ID, Passport, PAN, or Driving Licence. Uploaded identity documents are validated and stored securely.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Member, Family, and Emergency Data</h2>
              <p>
                We collect information necessary for proper care coordination, including sponsor and family information, relationships, sponsor contact details, emergency contacts, emergency and service preferences, preferred hospital information, nominee and local contact information, and specific service authorizations.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Medical and Health Information</h2>
              <p>
                We collect limited health and medical information to tailor our coordination services. This includes existing medical conditions (where voluntarily provided), blood group, insurance provider, insurance card/policy information, and coverage information. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">5. Document Storage and Access</h2>
              <p>
                Members may upload identity or other supporting documents to our platform. These uploaded documents are stored privately in our systems with restricted access. Security and access controls are applied so that documents are made available only to authorized users and personnel for legitimate administrative or service-delivery purposes.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">6. Payment Information</h2>
              <p>
                When you make a payment, we retain transaction-related information such as the invoice information, invoice number, receipt number, payment status, payment amount, plan and service information, payment date, transaction and reference identifiers, payment-provider order/payment references, refund information, and payment verification data. 
              </p>
              <p>
                Sunshine Elder Care does not store raw payment-instrument credentials (such as full card numbers, CVV, UPI PIN, ATM PIN, or bank/netbanking passwords). Payment processing is securely handled by our third-party payment gateway processor.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">7. Purposes of Processing</h2>
              <p>
                Your data is processed for purposes including: account creation, identity verification, member administration, providing requested services, care/service coordination, emergency coordination, communication, membership management, payment processing, invoice and receipt generation, refund and cancellation processing, customer support, service administration, security, fraud prevention, access control, audit logging, fulfilling legal and compliance obligations, dispute resolution, and service improvement.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">8. Third-Party Disclosure</h2>
              <p>
                We do not sell your personal information. We may disclose your information to trusted third-party service providers who are necessary to operate the platform and provide requested services. These include payment processors, hosting and infrastructure providers, database and storage providers, email providers, and authentication providers. Additionally, we may coordinate with healthcare and service providers (such as hospitals, doctors, ambulance providers, diagnostic providers, physiotherapy providers, and caregivers) and provide them with relevant data to deliver care. We may also disclose information to legal or regulatory authorities where required by law.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">9. Security</h2>
              <p>
                We use reasonable technical and organizational safeguards to protect your data. These controls include authenticated accounts, role-based access, server-side authorization, ownership and access controls, private document storage, authorized document access, file validation, rate limiting, audit logging, secure session handling, protected server-side secrets, and payment-provider integration without raw payment-card storage.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">10. Retention</h2>
              <p>
                We retain your information for as long as reasonably necessary to fulfill the purposes outlined in this policy, including service delivery, managing the membership relationship, maintaining invoices/receipts and accounting, keeping payment/refund records, fulfilling security and audit purposes, and meeting legal, regulatory, or dispute resolution obligations. When no longer required, information is deleted, anonymized, or securely disposed of subject to these operational and legal retention requirements.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">11. Cookies and Analytics</h2>
              <p>
                Our platform uses essential authentication and security cookies necessary to maintain your secure session. We also utilize Vercel Analytics and Vercel Insights to measure website performance and understand usage patterns.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">12. Email and Communication</h2>
              <p>
                We use member contact information to send account messages, service communications, membership updates, payment confirmations, invoices, receipts, refund/cancellation communications, administrative notifications, and support messages. Our transactional sender email is care@sunshineeldercare.in, and our general contact email is info.sunshineeldercare@gmail.com.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">13. User Privacy Requests</h2>
              <p>
                Subject to applicable law, you may request access to, correction of, or deletion of your personal data. You may also withdraw your consent where applicable, seek clarification about processing, or raise a privacy/security complaint. Please note that deletion requests may not be fulfilled if we are legally required to retain the data. For such requests, please contact us at info.sunshineeldercare@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Legal Contact Information</h2>
              <p>
                If you have any questions or concerns regarding this Privacy Policy, you may contact us at:
              </p>
              <ul className="mt-4 space-y-2">
                <li><strong>Company:</strong> SUNSHINE ELDER CARE</li>
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
