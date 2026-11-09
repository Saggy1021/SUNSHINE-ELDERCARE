import { CarePlansSection } from '@/components/yoga/care-plans-section'
import { PhilosophyLibrary } from '@/components/yoga/philosophy-library'
import { Metadata } from 'next'
import { CmsService } from '@/lib/services/cms'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isInternalDemoAuthorized } from '@/app/actions/invoices'
import { carePricingService, type CarePlanCatalogEntry } from '@/lib/services/care-plans'

// Force dynamic rendering — reads care plan catalog from DB on every request.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await CmsService.getPageBySlug('membership');
  const seo = page?.seoMetadata;
  return {
    title: seo?.title || 'Membership Plans | Sunshine Eldercare',
    description: seo?.description || 'View our membership plans tailored to provide essential, comprehensive, and holistic eldercare support.',
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function MembershipPage() {
  const session = await auth()
  let demoPlan: CarePlanCatalogEntry | null = null

  if (session?.user?.id) {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, email: true },
      })

      const isAuthorized = await isInternalDemoAuthorized(user)
      if (isAuthorized) {
        const allPlans = await carePricingService.getCatalog({ includeInternalDemo: true })
        demoPlan = allPlans.find((p) => p.slug === 'internal-razorpay-demo') ?? null
      }
    } catch (e) {
      console.error('[MembershipPage] Error resolving demo service authorization:', e)
    }
  }

  const faqs = await CmsService.getFaqs();

  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <CarePlansSection demoPlan={demoPlan} />
      <PhilosophyLibrary faqs={faqs} />
    </main>
  )
}
