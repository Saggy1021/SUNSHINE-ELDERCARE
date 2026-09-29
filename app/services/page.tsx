import { PracticeCollection } from "@/components/yoga/practice-collection"
import { EightLimbs } from "@/components/yoga/eight-limbs"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Our Services & Programs | Sunshine Elder Care",
  description: "Explore our comprehensive care options, medical coordination, and structured eldercare programs.",
}

export default function ServicesPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <PracticeCollection />
      <EightLimbs />
    </main>
  )
}
