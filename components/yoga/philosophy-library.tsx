'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

const books = [
  {
    title: 'Emergency Response',
    author: 'Question 01',
    spine: 'bg-maroon text-ivory',
    desc: 'We guarantee an emergency response time of under 30 minutes within our primary coverage zones, thanks to our dedicated ERC network.',
  },
  {
    title: 'Caregiver Vetting',
    author: 'Question 02',
    spine: 'bg-primary text-ivory',
    desc: 'Every caregiver and nurse undergoes a rigorous 4-step background check, including police verification and comprehensive medical training.',
  },
  {
    title: 'Plan Flexibility',
    author: 'Question 03',
    spine: 'bg-gold text-brown',
    desc: 'You can upgrade, pause, or customize your membership plan at any time to match the evolving needs of your loved ones.',
  },
  {
    title: 'Medical Care',
    author: 'Question 04',
    spine: 'bg-copper text-ivory',
    desc: 'We coordinate with your existing family doctors and preferred hospitals to ensure seamless continuity of care.',
  },
]

export function PhilosophyLibrary({ faqs }: { faqs?: any[] }) {
  const [active, setActive] = useState(0)

  const displayBooks = faqs && faqs.length > 0 
    ? faqs.map((faq, i) => ({
        title: faq.question,
        author: `Question ${String(i + 1).padStart(2, '0')}`,
        spine: ['bg-maroon text-ivory', 'bg-primary text-ivory', 'bg-gold text-brown', 'bg-copper text-ivory'][i % 4],
        desc: faq.answer,
      }))
    : books;

  return (
    <section className="relative overflow-hidden bg-secondary/50 py-24 paper-texture sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Common Questions</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Pull a topic from the shelf to learn more about how Sunshine Elder Care works.
          </p>
        </Reveal>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          {/* Wooden shelf with book spines */}
          <Reveal>
            <div className="rounded-2xl bg-gradient-to-b from-[#5a3a22] to-[#3a2618] p-6 shadow-2xl">
              <div className="flex items-end justify-center gap-3 sm:gap-4">
                {displayBooks.map((b, i) => (
                  <button
                    key={b.title}
                    onClick={() => setActive(i)}
                    className={cn(
                      'flex origin-bottom flex-col items-center justify-between rounded-t-md px-3 py-5 font-display text-sm font-bold shadow-md transition-all duration-300',
                      b.spine,
                      active === i
                        ? '-translate-y-3 ring-2 ring-gold'
                        : 'hover:-translate-y-1.5',
                    )}
                    style={{ height: `${190 + (i % 2) * 26}px`, width: '52px' }}
                    aria-label={b.title}
                  >
                    <BookOpen className="size-4 opacity-70" />
                    <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">
                      {b.title}
                    </span>
                    <span className="size-1.5 rounded-full bg-current opacity-50" />
                  </button>
                ))}
              </div>
              {/* shelf plank */}
              <div className="mt-2 h-3 rounded-sm bg-[#2a1b10] shadow-inner" />
            </div>
          </Reveal>

          {/* Selected book */}
          <Reveal delay={120}>
            <article
              key={active}
              className="rounded-[1.75rem] border border-gold/40 bg-card p-8 shadow-lg"
            >
              <p className="font-serif text-sm uppercase tracking-[0.3em] text-primary">
                {displayBooks[active]?.author}
              </p>
              <h3 className="mt-3 font-display text-3xl font-bold">
                {displayBooks[active]?.title}
              </h3>
              <div className="my-5 h-px w-full bg-gradient-to-r from-gold/60 to-transparent" />
              <p className="font-serif text-lg leading-relaxed text-foreground/80">
                {displayBooks[active]?.desc}
              </p>
              <button className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                <BookOpen className="size-4" />
                Read All FAQs
              </button>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
