import { Reveal } from '@/components/yoga/reveal'
import { Eyebrow } from '@/components/yoga/ornaments'
import { carePricingService, type CarePlanCatalogEntry } from '@/lib/services/care-plans'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

// Plan card images — maintained in order matching DB sortOrder
export const PLAN_IMAGES: Record<string, string> = {
  'shield-shine': '/images/care-plan-shield-shine.jpg',
  'semi-shield-shine': '/images/care-plan-semi-shield-shine.jpg',
  'life-line-care': '/images/care-plan-life-line-care.jpg',
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export async function CarePlansSection({ demoPlan }: { demoPlan?: CarePlanCatalogEntry | null } = {}) {
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

        {/* Private Authorized Demo Service Card */}
        {demoPlan && (
          <Reveal className="mt-12">
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-8 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                    Authorized Internal Demo Service
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                    {demoPlan.name}
                  </h3>
                  <p className="max-w-2xl font-serif text-sm text-foreground/80 leading-relaxed">
                    Dedicated testing service to validate live Razorpay payments, invoice generation, and settlement workflows.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs sm:text-sm">
                    <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 font-medium">
                      Base Price: <strong className="text-foreground">₹20</strong>
                    </div>
                    <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 font-medium">
                      GST (18% Exempt): <strong className="text-foreground">₹0</strong>
                    </div>
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-900 dark:text-amber-200">
                      Total: ₹20
                    </div>
                    <span className="text-xs text-muted-foreground font-serif">
                      • Single Variant • 1 Month Duration
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                  <Link
                    href={`/membership/${demoPlan.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-brown shadow-sm transition-all hover:bg-gold/90 hover:shadow-md"
                  >
                    Select Demo Service
                    <ArrowRight className="size-4" />
                  </Link>
                  <span className="text-center text-[11px] text-muted-foreground font-serif">
                    Restricted to authorized demo accounts
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {catalog.map((plan, i) => {
            const singleVariant = plan.variants.find((v) => v.variantType === 'SINGLE')
            const image = PLAN_IMAGES[plan.slug] || '/images/care-plan-shield-shine.jpg'
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
                      className="aspect-[3/4] w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/20 to-transparent" />
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
