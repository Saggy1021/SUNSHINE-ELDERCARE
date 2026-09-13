import { CarePlansSection } from '@/components/yoga/care-plans-section'
import { PhilosophyLibrary } from '@/components/yoga/philosophy-library'
import { Metadata } from 'next'

// Force dynamic rendering — reads care plan catalog from DB on every request.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Membership Plans | Sunshine Elder Care',
  description:
    'View our membership plans tailored to provide essential, comprehensive, and holistic eldercare support.',
}

export default async function MembershipPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <CarePlansSection />
      <PhilosophyLibrary />
    </main>
  )
}