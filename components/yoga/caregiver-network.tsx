import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import { CheckCircle2 } from 'lucide-react'

export function CaregiverNetwork() {
  return (
    <section id="caregiver-network" className="relative overflow-hidden bg-secondary/20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <Reveal className="order-2 lg:order-1 relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-gold/30 shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)]">
              <img
                src="/images/caregiver-network.jpg"
                alt="Compassionate caregiver assisting a senior"
                className="aspect-square w-full object-cover"

              />
              <div className="absolute inset-0 bg-gradient-to-t from-brown/60 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-ivory">
                <p className="font-display text-2xl font-bold">Trusted Caregiver Network</p>
                <p className="mt-2 font-serif text-sm opacity-90">Rigorous qualification and verification</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <Eyebrow>Quality Care at Home</Eyebrow>
            <h2 className="mt-5 text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
              Our Caregiver Marketplace
            </h2>
            <p className="mt-6 font-serif text-lg leading-relaxed text-foreground/80">
              Sunshine Elder Care provides access to a dedicated caregiver marketplace designed to match your loved ones with the right support.
            </p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-foreground/80">
              Every caregiver in our network is subjected to a rigorous qualification and verification system before they are permitted to serve our members. This ensures that the individuals entering your home meet our strict standards for professionalism, capability, and empathy.
            </p>

            <ul className="mt-8 space-y-4">
              {['Caregiver Marketplace Access', 'Caregiver Qualification Process', 'Caregiver Verification System'].map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-primary" />
                  <span className="font-medium text-foreground/90">{feature}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
