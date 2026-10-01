import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import { HeartPulse, Stethoscope, Activity, Crosshair, Building2, Car } from 'lucide-react'

const medicalServices = [
  { name: 'Nursing', icon: HeartPulse },
  { name: 'Physiotherapy', icon: Activity },
  { name: 'Diagnostic Services', icon: Crosshair },
  { name: 'Doctor Networks', icon: Stethoscope },
  { name: 'Hospital Networks', icon: Building2 },
  { name: 'Ambulance Services', icon: Car },
]

export function MedicalNetwork() {
  return (
    <section id="medical-network" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
        <Reveal>
          <Eyebrow>Coordinated Healthcare</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Health & Medical Support Network
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-serif text-lg leading-relaxed text-foreground/80">
            Beyond our direct eldercare services, Sunshine coordinates a comprehensive ecosystem of health and medical support partners to ensure complete care for your loved ones.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:gap-8 md:grid-cols-3 lg:grid-cols-6">
          {medicalServices.map((service, index) => {
            const Icon = service.icon
            return (
              <Reveal key={service.name} delay={index * 100}>
                <div className="group flex h-full flex-col items-center justify-center rounded-2xl border border-gold/20 bg-card p-6 text-center transition-colors hover:border-gold/50 hover:bg-secondary/20">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-sm font-bold sm:text-base leading-tight">{service.name}</h3>
                </div>
              </Reveal>
            )
          })}
        </div>
        
        <Reveal delay={200} className="mt-12">
          <p className="text-sm font-serif text-muted-foreground italic">
            * These services are coordinated through our trusted network of healthcare partners and service providers.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
