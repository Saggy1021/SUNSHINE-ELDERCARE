import { Essence } from "@/components/yoga/essence"
import { TraditionsMap } from "@/components/yoga/traditions-map"
import { Gurus } from "@/components/yoga/gurus"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us | Sunshine Elder Care",
  description: "Learn about our philosophy, our coverage areas, and the expert medical team behind Sunshine Elder Care.",
}

export default function AboutUsPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <Essence />
      <TraditionsMap />
      <Gurus />
    </main>
  )
}