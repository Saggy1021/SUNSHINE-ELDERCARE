import { notFound } from 'next/navigation'
import { carePricingService } from '@/lib/services/care-plans'
import { PriceCalculator } from '@/components/yoga/price-calculator'
import { Reveal } from '@/components/yoga/reveal'
import { Eyebrow } from '@/components/yoga/ornaments'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/auth'
import type { Metadata } from 'next'

// Force dynamic rendering — this page reads from the database on every request.
// Do not statically generate at build time.
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const catalog = await carePricingService.getCatalog()
  const plan = catalog.find((p) => p.slug === slug)
  if (!plan) return {}
  return {
    title: `${plan.name} | Sunshine Eldercare`,
    description: `View ${plan.name} care plan pricing, included services, and available durations.`,
  }
}

export default async function CarePlanDetailPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  const isAuthenticated = !!session?.user?.id
  const catalog = await carePricingService.getCatalog()
  const plan = catalog.find((p) => p.slug === slug)

  if (!plan) notFound()

  const singleVariant = plan.variants.find((v) => v.variantType === 'SINGLE')
  const coupleVariant = plan.variants.find((v) => v.variantType === 'COUPLE')

  const services = singleVariant?.services ?? coupleVariant?.services ?? []

  function formatINR(amount: number) {
    return `₹${amount.toLocaleString('en-IN')}`
  }

  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-gold transition-colors mb-8"
            >
              ← Back to all plans
            </Link>
            <Eyebrow>Care Plan Details</Eyebrow>
            <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{plan.name}</h1>
          </Reveal>

          <div className="mt-12 grid gap-12 lg:grid-cols-2">
            {/* Pricing Breakdown */}
            <Reveal>
              <div className="space-y-6">
                <h2 className="font-display text-2xl font-bold">Monthly Pricing</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {singleVariant && (
                    <div className="rounded-2xl border border-gold/30 bg-card p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                      <p className="text-xs uppercase tracking-widest text-gold font-semibold">Single</p>
                      <p className="mt-3 text-3xl font-bold font-display">{formatINR(singleVariant.monthlyTotal)}<span className="text-sm font-normal text-foreground/50"> /mo</span></p>
                      <div className="mt-3 text-xs text-foreground/50 space-y-1">
                        <p>Base: {formatINR(singleVariant.monthlyBasePrice)}</p>
                        <p>Inclusive of all applicable taxes/charges: {formatINR(singleVariant.monthlyGst)}</p>
                      </div>
                    </div>
                  )}
                  {coupleVariant && (
                    <div className="rounded-2xl border border-gold/30 bg-card p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                      <p className="text-xs uppercase tracking-widest text-gold font-semibold">Couple</p>
                      <p className="mt-3 text-3xl font-bold font-display">{formatINR(coupleVariant.monthlyTotal)}<span className="text-sm font-normal text-foreground/50"> /mo</span></p>
                      <div className="mt-3 text-xs text-foreground/50 space-y-1">
                        <p>Base: {formatINR(coupleVariant.monthlyBasePrice)}</p>
                        <p>Inclusive of all applicable taxes/charges: {formatINR(coupleVariant.monthlyGst)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration prices */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Package Pricing</h3>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left font-semibold text-foreground/70">Duration</th>
                          {singleVariant && <th className="px-4 py-3 text-right font-semibold text-foreground/70">Single</th>}
                          {coupleVariant && <th className="px-4 py-3 text-right font-semibold text-foreground/70">Couple</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[3, 6, 12].map((m) => {
                          const sd = singleVariant?.durations.find((d) => d.months === m)
                          const cd = coupleVariant?.durations.find((d) => d.months === m)
                          if (!sd && !cd) return null
                          return (
                            <tr key={m} className="bg-card hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium">
                                {m} Months
                                {(sd?.hasDiscount || cd?.hasDiscount) && (
                                  <span className="ml-2 text-xs text-gold">{sd?.discountNote ?? cd?.discountNote}</span>
                                )}
                              </td>
                              {singleVariant && (
                                <td className="px-4 py-3 text-right font-semibold">
                                  {sd ? formatINR(sd.documentedTotal) : '—'}
                                </td>
                              )}
                              {coupleVariant && (
                                <td className="px-4 py-3 text-right font-semibold">
                                  {cd ? formatINR(cd.documentedTotal) : '—'}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Included services */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Included Services</h3>
                  <ul className="space-y-2">
                    {services.map((svc) => (
                      <li key={svc.serviceName} className="flex items-start gap-3 text-sm text-foreground/80">
                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                        <span>
                          {svc.serviceName}
                          {svc.serviceNote && (
                            <span className="block text-xs text-foreground/50 mt-0.5">{svc.serviceNote}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Price Calculator */}
            <Reveal delay={150}>
              <PriceCalculator plan={plan} isAuthenticated={isAuthenticated} />
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  )
}
