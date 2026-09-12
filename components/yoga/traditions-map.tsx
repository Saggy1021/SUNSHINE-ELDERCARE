'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

const places = [
  {
    id: 'kolkata',
    name: 'Kolkata',
    top: '46%',
    left: '68%',
    tradition: 'Headquarters & Primary Care Center',
    history:
      'Our primary operational hub providing the full spectrum of Sunshine Elder Care services, including rapid emergency response and daily companionship.',
    image: '/images/tradition-varanasi.png',
  },
  {
    id: 'delhi',
    name: 'Delhi NCR',
    top: '26%',
    left: '46%',
    tradition: 'Comprehensive Senior Support',
    history:
      'Serving the capital region with dedicated caregivers, specialized nursing, and our trusted Pulse Care+ advanced tracking systems.',
    image: '/images/tradition-rishikesh.png',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    top: '60%',
    left: '30%',
    tradition: 'Urban Eldercare Solutions',
    history:
      'Tailored companion care and medical coordination for seniors navigating life in the bustling metropolis, ensuring safety and peace of mind.',
    image: '/images/tradition-mysore.png',
  },
  {
    id: 'bangalore',
    name: 'Bangalore',
    top: '74%',
    left: '40%',
    tradition: 'Tech-Enabled Health Monitoring',
    history:
      'Integrating modern health tracking with compassionate caregiving. Our Bangalore team focuses on continuous support and preventive wellness.',
    image: '/images/tradition-kerala.png',
  },
]

export function TraditionsMap() {
  const [active, setActive] = useState(places[0])

  return (
    <section id="traditions" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Where We Operate</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Our Coverage Areas
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Sunshine Elder Care is expanding its reach to ensure that compassionate senior care is available across major metropolitan hubs.
          </p>
        </Reveal>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          {/* Vintage atlas map */}
          <Reveal className="relative">
            <div className="relative overflow-hidden rounded-[2rem] heritage-border">
              <img
                src="/images/india-atlas-map.png"
                alt="Vintage atlas-style map of India"
                className="aspect-square w-full object-cover"
              />
              {places.map((p) => {
                const selected = p.id === active.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p)}
                    className="absolute -translate-x-1/2 -translate-y-full"
                    style={{ top: p.top, left: p.left }}
                    aria-label={`Show ${p.name}`}
                  >
                    <span className="relative flex flex-col items-center">
                      {selected && (
                        <span className="absolute -top-1 size-8 animate-ping rounded-full bg-primary/40" />
                      )}
                      <MapPin
                        className={cn(
                          'size-7 drop-shadow transition-all',
                          selected
                            ? 'scale-125 fill-primary text-primary-foreground'
                            : 'fill-gold/80 text-brown hover:scale-110',
                        )}
                      />
                      <span
                        className={cn(
                          'mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors',
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card/90 text-foreground',
                        )}
                      >
                        {p.name}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Reveal>

          {/* Detail panel */}
          <Reveal delay={120}>
            <article
              key={active.id}
              className="overflow-hidden rounded-[2rem] border border-gold/35 bg-card shadow-lg"
            >
              <div className="relative h-52 overflow-hidden sm:h-64">
                <img
                  src={active.image || '/placeholder.svg'}
                  alt={`${active.name}, India`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brown/70 to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <p className="font-display text-3xl font-bold text-ivory text-shadow-warm">
                    {active.name}
                  </p>
                </div>
              </div>
              <div className="p-7">
                <p className="font-serif text-xl italic text-primary">
                  {active.tradition}
                </p>
                <p className="mt-4 font-serif text-lg leading-relaxed text-foreground/80">
                  {active.history}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {places.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActive(p)}
                      className={cn(
                        'rounded-full border px-4 py-1.5 text-sm transition-colors',
                        p.id === active.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gold/40 text-foreground/70 hover:border-primary',
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
