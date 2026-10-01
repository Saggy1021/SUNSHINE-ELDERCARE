import { PracticeCollection } from "@/components/yoga/practice-collection"
import { MedicalNetwork } from "@/components/yoga/medical-network"
import { CaregiverNetwork } from "@/components/yoga/caregiver-network"
import { EmergencyAssistance } from "@/components/yoga/emergency-assistance"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Our Services & Programs | Sunshine Elder Care",
  description: "Explore our comprehensive care options, medical coordination, and structured eldercare programs.",
}

export default function ServicesPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <PracticeCollection />
      <MedicalNetwork />
      <CaregiverNetwork />
      <EmergencyAssistance />
    </main>
  )
}
