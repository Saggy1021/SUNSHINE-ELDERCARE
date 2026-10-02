import { AboutSunshine } from "@/components/yoga/about-sunshine"
import { ArmyTeam } from "@/components/yoga/army-team"
import { Gurus } from "@/components/yoga/gurus"
import { Credentials } from "@/components/yoga/credentials"
import { Metadata } from "next"
import { CmsService } from "@/lib/services/cms"

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await CmsService.getPageBySlug('about-us');
  const seo = page?.seoMetadata;
  return {
    title: seo?.title || "About Us | Sunshine Elder Care",
    description: seo?.description || "Learn about our philosophy, our coverage areas, and the expert medical team behind Sunshine Elder Care.",
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function AboutUsPage() {
  const employees = await CmsService.getPublicEmployees();

  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <AboutSunshine />
      <ArmyTeam />
      <Gurus employees={employees} />
      <Credentials />
    </main>
  )
}
