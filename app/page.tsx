import { Hero } from "@/components/yoga/hero"
import { Essence } from "@/components/yoga/essence"
import { EightLimbs } from "@/components/yoga/eight-limbs"
import { PracticeCollection } from "@/components/yoga/practice-collection"
import { Testimonials } from "@/components/yoga/testimonials"
import { ContactCommunity } from "@/components/yoga/contact-community"

export default function Page() {
  return (
    <main className="relative overflow-x-clip min-h-screen">
      <Hero />
      <Essence />
      <PracticeCollection />
      <EightLimbs />
      <Testimonials />
      <ContactCommunity />
    </main>
  )
}
