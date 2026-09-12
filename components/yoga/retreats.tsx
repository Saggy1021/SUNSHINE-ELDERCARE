import { ArrowRight } from 'lucide-react'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import Link from 'next/link'

const retreats = [
  {
    id: 'basic',
    name: 'Basic Plan',
    location: 'Essential Care',
    days: '₹14,100 / yr',
    desc: 'Our fundamental care package including 24/7 emergency response helpline and regular health check-ins.',
    image: '/images/retreat-himalaya.png',
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    location: 'Comprehensive Care',
    days: '₹25,000 / yr',
    desc: 'Includes everything in Basic, plus monthly doctor visits, regular diagnostic tests, and dedicated companionship hours.',
    image: '/images/retreat-kerala.png',
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    location: 'Holistic Support',
    days: '₹40,000 / yr',
    desc: 'Full-spectrum support with weekly caregiver visits, physiotherapy sessions, and dedicated healthcare management.',
    image: '/images/retreat-rishikesh.png',
  },
]

export function Retreats() {
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
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {retreats.map((r, i) => (
            <Reveal key={r.name} delay={i * 110}>
              <article className="group relative h-full overflow-hidden rounded-[1.5rem] border border-gold/40 bg-card shadow-md transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                {/* Poster */}
                <div className="relative overflow-hidden">
                  <img
                    src={r.image || '/placeholder.svg'}
                    alt={`${r.name} travel poster`}
                    className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brown/85 via-brown/10 to-transparent" />
                  <span className="absolute right-4 top-4 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brown">
                    {r.days}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-gold">
                      {r.location}
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold text-ivory text-shadow-warm">
                      {r.name}
                    </h3>
                    <p className="mt-3 font-serif text-base leading-relaxed text-ivory/85">
                      {r.desc}
                    </p>
                    <Link href={`/checkout?planId=${r.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ivory transition-colors group-hover:text-gold">
                      Subscribe Now
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
