import { Reveal } from './reveal'
import { Eyebrow, Mandala } from './ornaments'
import { CheckCircle2 } from 'lucide-react'

const approachSteps = [
  {
    step: '01',
    title: 'Understanding Your Needs',
    desc: "Understand the senior's needs, daily routine, family expectations and support requirements.",
  },
  {
    step: '02',
    title: 'Personalised Care Planning',
    desc: 'Determine the appropriate Sunshine services and care resources.',
  },
  {
    step: '03',
    title: 'Coordinated Care',
    desc: 'Coordinate appropriate health, medical, caregiver and eldercare services.',
  },
  {
    step: '04',
    title: 'Continuous Support',
    desc: 'Provide wellness calls, scheduled visits, senior staff support and ongoing family communication.',
  },
  {
    step: '05',
    title: 'Emergency Assistance',
    desc: "Provide 24/7 emergency assistance with the confirmed target response of reaching the member's location within 30 minutes.",
  },
]

export function Essence() {
  return (
    <section id="approach" className="relative overflow-hidden bg-secondary/10 py-24 sm:py-32">
      <Mandala className="animate-spin-slower pointer-events-none absolute -right-40 top-10 h-96 w-96 opacity-[0.05]" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>How We Care</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Our Approach
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/80">
            A structured, dependable framework designed to bring total peace of mind to seniors and their families.
          </p>
        </Reveal>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="relative border-l-2 border-gold/30 pl-8 space-y-12 ml-4 md:ml-0 md:pl-0 md:border-l-0 md:space-y-0 md:grid md:grid-cols-1 md:gap-8">
            {approachSteps.map((item, index) => (
              <Reveal key={item.step} delay={index * 100} className="relative md:flex md:items-start md:gap-8 md:bg-card md:p-6 md:rounded-2xl md:border md:border-gold/20 md:shadow-sm">
                {/* Mobile line indicator */}
                <div className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-brown md:hidden">
                  <span className="text-[10px] font-bold">{item.step}</span>
                </div>
                
                {/* Desktop indicator */}
                <div className="hidden md:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-lg font-bold">
                  {item.step}
                </div>

                <div>
                  <h3 className="font-display text-xl font-bold text-primary">{item.title}</h3>
                  <p className="mt-2 font-serif text-base text-foreground/80 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
