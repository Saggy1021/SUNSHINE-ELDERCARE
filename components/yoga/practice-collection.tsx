import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import Link from 'next/link'
import { ArrowRight, PhoneCall, Stethoscope, UserCheck, ShieldAlert, HeartHandshake } from 'lucide-react'

const coreServices = [
  {
    name: 'Comprehensive Care',
    desc: 'Holistic care management tailored to your specific requirements and health conditions.',
    icon: HeartHandshake,
  },
  {
    name: 'Daily Wellness Calls',
    desc: 'Regular check-ins to monitor health, mood, and provide daily reassurance.',
    icon: PhoneCall,
  },
  {
    name: 'Monthly Senior Staff Visit',
    desc: 'In-person visits by our experienced senior staff to ensure care quality and well-being.',
    icon: UserCheck,
  },
  {
    name: 'Outdoor Visits',
    desc: 'Accompanied outdoor visits according to plan, assisting with essential errands or social outings.',
    icon: Stethoscope,
  },
  {
    name: '24/7 Emergency Assistance',
    desc: 'Immediate round-the-clock support when you need it most.',
    icon: ShieldAlert,
  },
]

export function PracticeCollection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Core Offerings</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Core Eldercare Services
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/80">
            Our fundamental services provided directly by Sunshine Eldercare to guarantee continuous support, engagement, and safety.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreServices.map((service, index) => {
            const Icon = service.icon
            return (
              <Reveal key={service.name} delay={index * 100}>
                <div className="group relative flex h-full flex-col rounded-2xl border border-gold/30 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{service.name}</h3>
                  <p className="mt-2 flex-grow font-serif text-sm text-foreground/75 leading-relaxed">
                    {service.desc}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-6 py-3 text-sm font-medium text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            Explore All Services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
