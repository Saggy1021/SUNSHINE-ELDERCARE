import { PhilosophyLibrary } from "@/components/yoga/philosophy-library"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Sunshine Elder Care",
  description: "Find answers to common questions about our eldercare services, plans, and emergency response.",
}

export default function FAQsPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <PhilosophyLibrary />
    </main>
  )
}