import { DailyRitual } from "@/components/yoga/daily-ritual"
import { Testimonials } from "@/components/yoga/testimonials"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Moments of Care | Sunshine Elder Care",
  description: "Experience a day in the life with Sunshine Elder Care. See how we structure our care around health and happiness.",
}

export default function MomentsOfCarePage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <DailyRitual />
      <Testimonials />
    </main>
  )
}