import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import Link from 'next/link'

const practices = [
  {
    name: 'Medical Coordination',
    slug: 'medical-coordination',
    path: 'Health Management',
    desc: 'Regular doctor visits and comprehensive health monitoring.',
    image: '/images/stamp-hatha.png',
    rotate: '-rotate-3',
  },
  {
    name: 'Companionship',
    slug: 'companionship',
    path: 'Emotional Support',
    desc: 'Engaging conversations and focus on emotional well-being.',
    image: '/images/stamp-raja.png',
    rotate: 'rotate-2',
  },
  {
    name: 'Physiotherapy',
    slug: 'physiotherapy',
    path: 'Mobility & Strength',
    desc: 'At-home therapy for active, pain-free, and healthy aging.',
    image: '/images/stamp-bhakti.png',
    rotate: '-rotate-2',
  },
  {
    name: 'Nursing Support',
    slug: 'nursing-support',
    path: 'Specialized Care',
    desc: 'Professional nurses for daily assistance or post-operative care.',
    image: '/images/stamp-karma.png',
    rotate: 'rotate-3',
  },
  {
    name: 'Diagnostics',
    slug: 'diagnostics',
    path: 'Convenient Testing',
    desc: 'At-home lab sample collection and rapid reporting.',
    image: '/images/stamp-kundalini.png',
    rotate: '-rotate-1',
  },
]

export function PracticeCollection() {
  return (
    <section
      id="practices"
      className="relative overflow-hidden bg-secondary/50 py-24 paper-texture sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Comprehensive Care</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Our Primary Services
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Every service is tailored to respect the dignity and individual needs of our elders, bringing essential care directly to their doorstep.
          </p>
        </Reveal>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-10">
          {practices.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <Link href={`/services/${p.slug}`}>
                <article
                  className={`group relative w-60 transition-transform duration-500 ${p.rotate} hover:rotate-0 hover:-translate-y-2`}
                >
                  {/* Perforated stamp */}
                  <div className="rounded-md bg-ivory p-3 shadow-lg shadow-brown/15 [outline:3px_dashed_var(--ivory)] [outline-offset:-7px]">
                    <div className="overflow-hidden rounded-sm border border-dashed border-gold/50">
                      <div className="relative overflow-hidden">
                        <img
                          src={p.image || '/placeholder.svg'}
                          alt={`${p.name} illustration`}
                          className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brown/25 to-transparent" />
                      </div>
                      <div className="px-3 py-3 text-center">
                        <h3 className="font-display text-lg font-bold leading-tight">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 text-xs uppercase tracking-widest text-primary">
                          {p.path}
                        </p>
                        <p className="mt-2 font-serif text-sm leading-snug text-foreground/70">
                          {p.desc}
                        </p>
                      </div>
                    </div>
                    {/* faux postmark */}
                    <span className="absolute right-3 top-3 flex size-10 rotate-12 items-center justify-center rounded-full border-2 border-maroon/40 text-center font-display text-[8px] uppercase leading-none text-maroon/50">
                      Care
                    </span>
                  </div>
                </article>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
