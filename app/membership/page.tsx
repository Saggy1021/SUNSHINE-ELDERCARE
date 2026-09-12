import { Retreats } from "@/components/yoga/retreats"
import { PhilosophyLibrary } from "@/components/yoga/philosophy-library"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Membership Plans | Sunshine Elder Care",
  description: "View our membership plans tailored to provide essential, comprehensive, and holistic eldercare support.",
}

export default function MembershipPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <Retreats />
      <PhilosophyLibrary />
    </main>
  )
}