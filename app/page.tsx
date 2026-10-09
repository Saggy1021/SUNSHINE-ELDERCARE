import { Hero } from "@/components/yoga/hero"
import { Certifications } from "@/components/yoga/certifications"
import { ArmyTeam } from "@/components/yoga/army-team"
import { Essence } from "@/components/yoga/essence"
import { PracticeCollection } from "@/components/yoga/practice-collection"
import { MedicalNetwork } from "@/components/yoga/medical-network"
import { CaregiverNetwork } from "@/components/yoga/caregiver-network"
import { EmergencyAssistance } from "@/components/yoga/emergency-assistance"
import { CarePlansSection } from "@/components/yoga/care-plans-section"
import { ContactCommunity } from "@/components/yoga/contact-community"
import { TestimonialsSection, FaqsSection } from "@/components/yoga/cms-sections"

export default function Page() {
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
      <TestimonialsSection />
      
      {/* 11. FAQs */}
      <FaqsSection />
      
      {/* 12. Contact */}
      <ContactCommunity />
    </main>
  )
}
