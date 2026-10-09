import { Suspense } from "react"
import { Testimonials } from "./testimonials"
import { PhilosophyLibrary } from "./philosophy-library"
import { CmsService } from "@/lib/services/cms"
import { Activity } from "lucide-react"

function SectionLoader() {
  return (
    <div className="py-24 flex justify-center items-center">
      <Activity className="h-8 w-8 animate-pulse text-amber-600/50" />
    </div>
  )
}

export async function TestimonialsServer() {
  const testimonials = await CmsService.getTestimonials()
  return <Testimonials testimonials={testimonials} />
}

export async function FaqsServer() {
  const faqs = await CmsService.getFaqs()
  return <PhilosophyLibrary faqs={faqs} />
}

export function TestimonialsSection() {
  return (
    <Suspense fallback={<SectionLoader />}>
      <TestimonialsServer />
    </Suspense>
  )
}

export function FaqsSection() {
  return (
    <Suspense fallback={<SectionLoader />}>
      <FaqsServer />
    </Suspense>
  )
}
