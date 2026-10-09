import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CmsService } from '@/lib/services/cms'
import { Eyebrow } from '@/components/yoga/ornaments'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await CmsService.getPageBySlug(slug, true)
  if (!page) return {}
  
  return {
    title: page.seoMetadata?.title || `${page.title} | Sunshine Eldercare`,
    description: page.seoMetadata?.description || undefined,
  }
}

export default async function DynamicCmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await CmsService.getPageBySlug(slug, true)
  
  if (!page) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="bg-white p-8 sm:p-16 rounded-[2rem] shadow-xl border border-gold/20">
          <Eyebrow>Page</Eyebrow>
          <h1 className="mt-4 text-4xl font-display font-bold text-maroon mb-12">
            {page.title}
          </h1>

          <div 
            className="prose prose-lg prose-headings:font-display prose-headings:text-maroon prose-p:font-serif prose-p:text-foreground/80 max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content || '' }}
          />
        </div>
      </div>
    </main>
  )
}
