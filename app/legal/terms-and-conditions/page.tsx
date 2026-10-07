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
              Effective Date: 08 October 2026<br/>
              Last Updated: 08 October 2026
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Sunshine Elder Care website (https://sunshineeldercare.in) and associated services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. About Sunshine Elder Care</h2>
              <p>
                Sunshine Elder Care provides elder-care and support services, emergency assistance coordination, daily wellbeing and check-in support, companionship, hospital visit support, medical appointment coordination, nursing support, physiotherapy coordination, diagnostic coordination, doctor-network coordination, hospital-network coordination, ambulance and emergency coordination, caregiver-related services, insurance and paperwork assistance, bill and payment assistance, and social engagement and wellbeing support. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Services</h2>
              <p>
                Our services encompass various coordination and non-medical companionship roles. While we assist with health-related coordination (such as doctor, hospital, ambulance, or physiotherapy appointments), Sunshine Elder Care is a care coordinator. We do not provide direct medical treatment or act as a substitute for professional medical care. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Eligibility and Registration</h2>
              <p>
                You must be eligible under Indian law to enter into a binding contract to use our services. Registration requires accurate personal, contact, and medical information to ensure appropriate service delivery. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">5. Member Responsibilities</h2>
              <p>
                Members and their sponsors are responsible for providing complete, accurate, and up-to-date information, including emergency contacts and relevant health conditions. Sunshine Elder Care is not responsible for service delays or issues resulting from incorrect or incomplete information provided by the member.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">6. Membership Plans</h2>
              <p>
                We offer multiple membership plans (such as Monthly, Quarterly, Half-Yearly, and Annual) with specific service inclusions. Detailed plan descriptions and included services are available on our website.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">7. Pricing</h2>
              <p>
                Current plan prices are displayed on the Membership interface of our website. The applicable amount is shown to the customer before payment.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">8. Payment</h2>
              <p>
                Payments are processed through a secure third-party payment gateway. Upon initiating a purchase or renewal, an applicable invoice is created which records the amount applicable to the transaction. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">9. Payment Verification</h2>
              <p>
                Payment must be successfully verified before proceeding to membership activation. Once the payment is verified by the payment provider, the invoice is marked as paid and a receipt is generated.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">10. Membership Approval and Activation</h2>
              <p>
                Payment alone does not automatically guarantee immediate membership activation. After payment verification, the membership request awaits administrative approval. Membership activation and service scheduling occur only after this approval process is complete.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">11. Cancellation</h2>
              <p>
                Cancellation must be requested in writing through the registered email or official account-supported channel. Cancellation becomes effective only after acknowledgement and processing by Sunshine Elder Care. Services already delivered prior to cancellation may be considered in determining any applicable charges or refunds.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">12. Refunds</h2>
              <p>
                All refunds are subject to the schedule and terms outlined in our <a href="/legal/refund-cancellation">Refund & Cancellation Policy</a>.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">13. Service Delivery</h2>
              <p>
                We strive to deliver all scheduled services promptly and professionally. However, service delivery is subject to staff availability, weather conditions, and other factors. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">14. Third-Party Service Providers</h2>
              <p>
                We may coordinate with third-party professionals and entities such as doctors, hospitals, ambulance operators, diagnostic centers, and physiotherapists. These third-party providers remain responsible for their own professional services and conduct. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">15. Medical and Emergency-Service Disclaimer</h2>
              <p>
                Our support and coordination services do not replace emergency medical treatment. Members must use appropriate emergency medical services (such as calling a local ambulance or hospital) when immediate medical attention is required. Sunshine Elder Care does not guarantee any particular medical outcome.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">16. Member Information and Documents</h2>
              <p>
                Members are required to submit accurate information and valid identity documents as part of the service requirements.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">17. Privacy and Data Protection</h2>
              <p>
                The collection, use, and protection of your personal and medical data is governed by our <a href="/legal/privacy-policy">Privacy Policy</a>. 
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">18. Acceptable Use and Conduct</h2>
              <p>
                Members and their families are expected to interact respectfully with our staff and caregivers. Abusive behavior, harassment, or unreasonable demands may result in suspension or termination of services.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">19. Service Availability and Events Beyond Reasonable Control</h2>
              <p>
                Sunshine Elder Care shall not be liable for any delay or failure in performance due to events beyond our reasonable control, including but not limited to acts of God, natural disasters, strikes, civil unrest, or severe weather conditions.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">20. Limitation of Liability</h2>
              <p>
                Sunshine Elder Care limits its liability for unforeseen circumstances, medical complications, service interruptions outside our reasonable control, acts of third-party providers, or issues arising from incorrect or incomplete information supplied by members. Liability relating to a particular paid service may be limited to the amount paid for that specific service, subject to applicable law.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">21. Member Responsibility for Incorrect Information</h2>
              <p>
                Sunshine Elder Care accepts no liability for consequences arising from members providing false, inaccurate, or incomplete health, identity, or contact information.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">22. Suspension or Termination</h2>
              <p>
                We reserve the right to suspend or terminate membership for breach of these Terms, non-payment, or unacceptable conduct, with or without notice, depending on the severity of the violation.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">23. Changes to Terms</h2>
              <p>
                We may update these Terms and Conditions periodically. Continued use of our services constitutes acceptance of the revised terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">24. Governing Law and Dispute Resolution</h2>
              <p>
                These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or relating to these terms or our services shall be subject to the exclusive jurisdiction of the courts in Kolkata, West Bengal, India.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">25. Complaints and Customer Support</h2>
              <p>
                If you have a concern or complaint, please contact our support team. We aim to resolve issues promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">26. Contact Information</h2>
              <p>
                For any questions regarding these Terms, please contact us at:
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
