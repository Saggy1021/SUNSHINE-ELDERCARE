import { Hero } from "@/components/yoga/hero"
import { Certifications } from "@/components/yoga/certifications"
import { ArmyTeam } from "@/components/yoga/army-team"
import { Essence } from "@/components/yoga/essence"
import { PracticeCollection } from "@/components/yoga/practice-collection"
import { MedicalNetwork } from "@/components/yoga/medical-network"
import { CaregiverNetwork } from "@/components/yoga/caregiver-network"
import { EmergencyAssistance } from "@/components/yoga/emergency-assistance"
import { CarePlansSection } from "@/components/yoga/care-plans-section"
import { Testimonials } from "@/components/yoga/testimonials"
import { PhilosophyLibrary } from "@/components/yoga/philosophy-library"
import { ContactCommunity } from "@/components/yoga/contact-community"
import { CmsService } from "@/lib/services/cms"


export default async function Page() {
  const [testimonials, faqs] = await Promise.all([
    CmsService.getTestimonials(),
    CmsService.getFaqs()
  ]);

  return (
    <main className="relative overflow-x-clip min-h-screen">
      {/* 1. Brand / Hero */}
      <Hero />
      
      {/* 2. Certifications & Trust */}
      <Certifications />
      
      {/* 3. Retired Army Personnel Team */}
      <ArmyTeam />
      
      {/* 4. Our Approach */}
      <Essence />
      
      {/* 5. Core Eldercare Services */}
      <PracticeCollection />
      
      {/* 6. Health & Medical Support Network */}
      <MedicalNetwork />
      
      {/* 7. Caregiver Network */}
      <CaregiverNetwork />
      
      {/* 8. 24/7 Emergency Assistance */}
      <EmergencyAssistance />
      
      {/* 9. Membership Plans / Pricing */}
      <CarePlansSection />
      
      {/* 10. Moments of Care / Testimonials */}
      <Testimonials testimonials={testimonials} />
      
      {/* 11. FAQs */}
      <PhilosophyLibrary faqs={faqs} />
      
      {/* 12. Contact */}
      <ContactCommunity />
    </main>
  )
}
