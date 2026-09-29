import { businessData } from '@/lib/config/business-data'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/yoga/reveal'
import { Eyebrow } from '@/components/yoga/ornaments'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = businessData.programs.find(p => p.slug === slug)
  
  if (!service) {
    return {
      title: 'Service Not Found',
    }
  }

  return {
    title: `${service.title} | ${businessData.name}`,
    description: service.description,
  }
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params
  const service = businessData.programs.find(p => p.slug === slug)

  if (!service) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Content Side */}
          <Reveal>
            <Eyebrow>Sunshine Elder Care Services</Eyebrow>
            <h1 className="mt-6 text-4xl sm:text-5xl font-display font-bold text-maroon leading-tight">
              {service.title}
            </h1>
            <p className="mt-6 text-lg sm:text-xl font-serif text-foreground/80 leading-relaxed">
              {service.fullDescription}
            </p>

            <div className="mt-10">
              <h3 className="text-2xl font-display font-bold text-primary mb-6">Key Features</h3>
              <ul className="space-y-4">
                {service.features?.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-6 w-6 text-gold mr-3 flex-shrink-0 mt-0.5" />
                    <span className="font-serif text-lg text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link href="/membership" className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-lg font-medium transition-colors bg-maroon hover:bg-maroon/90 text-white">
                View Plans
              </Link>
              <Link href="/contact-us" className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-lg font-medium transition-colors border border-maroon text-maroon hover:bg-maroon/5">
                Contact Us
              </Link>
            </div>
          </Reveal>

          {/* Image Side */}
          <Reveal delay={200} className="relative">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={service.image || '/images/hero-1.png'} 
                alt={service.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-maroon/20 to-transparent"></div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gold rounded-full blur-2xl opacity-50 -z-10"></div>
          </Reveal>

        </div>
      </div>
    </main>
  )
}