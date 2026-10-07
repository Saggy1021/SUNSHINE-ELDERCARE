'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

export function FaqList({ faqs }: { faqs: any[] }) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <section className="relative overflow-hidden bg-secondary/30 py-24 paper-texture min-h-screen sm:py-32">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Knowledge Base</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold leading-tight sm:text-6xl">
            Complete FAQs
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty font-serif text-xl text-foreground/75">
            Everything you need to know about Sunshine Eldercare, our services, membership plans, and emergency response capabilities.
          </p>
        </Reveal>

        <div className="mt-16 space-y-4">
          {faqs.map((faq, i) => (
            <Reveal key={faq.id || i} delay={Math.min(i * 50, 500)}>
              <div 
                className={cn(
                  'overflow-hidden rounded-2xl border bg-card transition-colors duration-300',
                  active === i ? 'border-gold shadow-md' : 'border-primary/10 hover:border-primary/30'
                )}
              >
                <button
                  onClick={() => setActive(active === i ? null : i)}
                  className="flex w-full items-center justify-between p-6 text-left focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-background rounded-2xl"
                  aria-expanded={active === i}
                >
                  <span className="font-display text-lg font-bold sm:text-xl text-primary pr-8">{faq.question}</span>
                  <span className="flex-shrink-0 text-gold transition-transform duration-300">
                    {active === i ? <Minus className="size-5" /> : <Plus className="size-5" />}
                  </span>
                </button>
                <div 
                  className={cn(
                    'grid transition-all duration-300 ease-in-out',
                    active === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 font-serif text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
          {faqs.length === 0 && (
            <p className="text-center font-serif text-lg text-muted-foreground py-12">
              No frequently asked questions available at the moment.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
