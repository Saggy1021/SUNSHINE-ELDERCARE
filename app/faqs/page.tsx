import { FaqList } from "@/components/yoga/faq-list"
import { Metadata } from "next"
import { CmsService } from "@/lib/services/cms"

export async function generateMetadata(): Promise<Metadata> {
  const page = await CmsService.getPageBySlug('faqs');
  const seo = page?.seoMetadata;
  return {
    title: seo?.title || "Frequently Asked Questions | Sunshine Eldercare",
    description: seo?.description || "Find answers to common questions about our eldercare services, plans, and emergency response.",
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function FAQsPage() {
  const faqs = await CmsService.getFaqs();
  
  return (
    <main className="relative overflow-x-clip">
      <FaqList faqs={faqs} />
    </main>
  )
}
