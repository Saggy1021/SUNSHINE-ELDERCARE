import { CarePlansSection } from '@/components/yoga/care-plans-section'
import { PhilosophyLibrary } from '@/components/yoga/philosophy-library'
import { Metadata } from 'next'

import { CmsService } from '@/lib/services/cms'

// Force dynamic rendering — reads care plan catalog from DB on every request.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await CmsService.getPageBySlug('membership');
  const seo = page?.seoMetadata;
  return {
    title: seo?.title || 'Membership Plans | Sunshine Elder Care',
    description: seo?.description || 'View our membership plans tailored to provide essential, comprehensive, and holistic eldercare support.',
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function MembershipPage() {
  const faqs = await CmsService.getFaqs();

  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <CarePlansSection />
      <PhilosophyLibrary faqs={faqs} />
    </main>
  )
}
