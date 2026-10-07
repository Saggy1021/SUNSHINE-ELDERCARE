'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Minus, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

export function PhilosophyLibrary({ faqs }: { faqs?: any[] }) {
  const [active, setActive] = useState<number | null>(null)

  const displayFaqs = faqs && faqs.length > 0 
    ? faqs.slice(0, 6)
    : [
        {
          question: 'Emergency Response',
          answer: 'We guarantee an emergency response time of under 30 minutes within our primary coverage zones, thanks to our dedicated ERC network.',
        },
        {
          question: 'Caregiver Vetting',
          answer: 'Every caregiver and nurse undergoes a rigorous 4-step background check, including police verification and comprehensive medical training.',
        },
        {
          question: 'Plan Flexibility',
          answer: 'You can upgrade, pause, or customize your membership plan at any time to match the evolving needs of your loved ones.',
        },
        {
          question: 'Medical Care',
          answer: 'We coordinate with your existing family doctors and preferred hospitals to ensure seamless continuity of care.',
        },
      ];

  return (
    <section className="relative overflow-hidden bg-secondary/50 py-24 paper-texture sm:py-32">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Common Questions</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Learn more about how Sunshine Eldercare works and how we provide peace of mind for you and your loved ones.
          </p>
        </Reveal>

        <div className="mt-16 space-y-4">
          {displayFaqs.map((faq, i) => (
            <Reveal key={i} delay={i * 100}>
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
                  <span className="font-display text-lg font-bold sm:text-xl text-primary">{faq.question}</span>
                  <span className="ml-4 flex-shrink-0 text-gold transition-transform duration-300">
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
                    <p className="px-6 pb-6 font-serif text-base leading-relaxed text-foreground/80">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={600} className="mt-12 text-center">
          <Link href="/faqs" className="inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3.5 text-sm font-medium text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]">
            <HelpCircle className="size-4" />
            View All FAQs
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
