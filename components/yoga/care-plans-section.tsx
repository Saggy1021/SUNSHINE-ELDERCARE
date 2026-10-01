import { Reveal } from '@/components/yoga/reveal'
import { Eyebrow } from '@/components/yoga/ornaments'
import { carePricingService } from '@/lib/services/care-plans'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Plan card images — maintained in order matching DB sortOrder
const PLAN_IMAGES: Record<string, string> = {
  'shield-shine': '/images/retreat-himalaya.png',
  'semi-shield-shine': '/images/retreat-kerala.png',
  'life-line-care': '/images/retreat-rishikesh.png',
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export async function CarePlansSection() {
  const catalog = await carePricingService.getCatalog()

  return (
    <section id="retreats" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Join the Sunshine Family</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Membership Plans
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Choose a plan that best fits the needs of your loved ones. All plans are designed with flexibility and total peace of mind at their core.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80 font-serif">
            All prices are inclusive of applicable taxes.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {catalog.map((plan, i) => {
            const singleVariant = plan.variants.find((v) => v.variantType === 'SINGLE')
            const image = PLAN_IMAGES[plan.slug] || '/images/retreat-himalaya.png'
            const monthlyDisplay = singleVariant
              ? `${formatINR(singleVariant.monthlyTotal)} / mo`
              : 'View plans'

            return (
              <Reveal key={plan.slug} delay={i * 110}>
                <article className="group relative h-full overflow-hidden rounded-[1.5rem] border border-gold/40 bg-card shadow-md transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="relative overflow-hidden">
                    <img
                      src={image}
                      alt={`${plan.name} care plan`}
                      className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brown/85 via-brown/10 to-transparent" />
                    <span className="absolute right-4 top-4 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brown">
                      {monthlyDisplay}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <p className="text-xs uppercase tracking-[0.25em] text-gold">
                        {singleVariant ? 'Single & Couple Plans' : 'Care Package'}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold text-ivory text-shadow-warm">
                        {plan.name}
                      </h3>
                      {singleVariant && singleVariant.services.length > 0 && (
                        <p className="mt-3 font-serif text-base leading-relaxed text-ivory/85">
                          {singleVariant.services
                            .slice(0, 2)
                            .map((s) => s.serviceName)
                            .join(' · ')}
                          {singleVariant.services.length > 2 && ` + ${singleVariant.services.length - 2} more`}
                        </p>
                      )}
                      <Link
                        href={`/membership/${plan.slug}`}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ivory transition-colors group-hover:text-gold"
                      >
                        View Details
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
