import { Hero } from "@/components/yoga/hero"
import { Essence } from "@/components/yoga/essence"
import { EightLimbs } from "@/components/yoga/eight-limbs"
import { PracticeCollection } from "@/components/yoga/practice-collection"
import { Testimonials } from "@/components/yoga/testimonials"
import { ContactCommunity } from "@/components/yoga/contact-community"
import { CmsService } from "@/lib/services/cms"

export const dynamic = 'force-dynamic'

export default async function Page() {
  const testimonials = await CmsService.getTestimonials();

  return (
    <main className="relative overflow-x-clip min-h-screen">
      <Hero />
      <Essence />
      <PracticeCollection />
      <EightLimbs />
      <Testimonials testimonials={testimonials} />
      <ContactCommunity />
    </main>
  )
}
