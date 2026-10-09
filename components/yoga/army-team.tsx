import { Reveal } from './reveal'
import { Eyebrow, Mandala } from './ornaments'
import { ShieldCheck } from 'lucide-react'

export function ArmyTeam() {
  return (
    <section id="army-team" className="relative overflow-hidden py-24 sm:py-32">
      <Mandala className="animate-spin-slower pointer-events-none absolute -left-40 top-10 h-96 w-96 opacity-[0.05]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Story */}
        <Reveal className="max-w-xl">
          <Eyebrow>A Team Built on Service</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Unwavering Discipline & Responsibility
          </h2>
          <div className="mt-6 space-y-5 font-serif text-lg leading-relaxed text-foreground/80">
            <p className="font-semibold text-primary">
              All employees of Sunshine Eldercare, regardless of their position or role, are retired Army personnel.
            </p>
            <p>
              We bring the core values of our military service into the field of eldercare. Discipline, responsibility, preparedness, and accountability are not just words to us—they are the principles by which we operate every day.
            </p>
            <p>
              Our team is trained to handle critical situations with calmness and efficiency, ensuring that your loved ones receive the highest standard of respectful and dedicated service.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            {['Discipline', 'Responsibility', 'Preparedness', 'Accountability', 'Service', 'Respect'].map((value) => (
              <div key={value} className="flex items-center gap-2 rounded-full border border-gold/30 bg-secondary/30 px-4 py-2 text-sm font-medium text-primary transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:bg-gold/10">
                <ShieldCheck className="size-4 text-gold" />
                {value}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Image */}
        <Reveal delay={120} className="relative">
          <div className="group relative overflow-hidden rounded-[2rem] border border-gold/30 shadow-2xl">
            <img
              src="/images/army-team.jpg"
              alt="Retired Army personnel standing together"
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"

            />
            <div className="absolute inset-0 bg-gradient-to-t from-brown/50 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-ivory">
              <p className="font-display text-2xl font-bold">Committed to Care</p>
              <p className="font-serif text-sm opacity-90">Serving those who nurtured us</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
