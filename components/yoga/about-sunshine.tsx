import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import { Heart, ShieldCheck, MapPin } from 'lucide-react'

export function AboutSunshine() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Our Story</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            SUNSHINE ELDERCARE
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-serif text-lg leading-relaxed text-foreground/80">
            A Kolkata-based eldercare organization dedicated to preserving senior dignity and providing absolute family reassurance.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <Reveal className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-gold/30 shadow-2xl">
              <img
                src="/images/about-sunshine.jpg"
                alt="Happy senior with a caregiver"
                className="aspect-[4/3] w-full object-cover"

              />
              <div className="absolute inset-0 bg-gradient-to-t from-brown/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-ivory">
                <p className="font-display text-2xl font-bold">Compassion in Action</p>
                <p className="font-serif text-sm opacity-90">Serving the elderly with love and respect</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h3 className="font-display text-2xl font-bold text-primary mb-4">Structured Support & Service Ecosystem</h3>
            <div className="space-y-6 font-serif text-base leading-relaxed text-foreground/80">
              <p>
                We recognize that eldercare goes far beyond basic medical assistance. True social-care orientation requires a comprehensive ecosystem designed around the holistic well-being of seniors.
              </p>
              <p>
                Our structured support system seamlessly integrates core eldercare management, an expansive health and medical support network, and access to trusted caregiver resources. This ecosystem ensures that whether your loved ones require daily wellness check-ins, routine diagnostics, or 24/7 emergency response, they are thoroughly protected.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-gold/20 bg-secondary/20 p-4">
                <ShieldCheck className="size-6 text-gold shrink-0" />
                <div>
                  <h4 className="font-bold font-display text-sm">Family Reassurance</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Complete transparency and continuous communication.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-gold/20 bg-secondary/20 p-4">
                <Heart className="size-6 text-gold shrink-0" />
                <div>
                  <h4 className="font-bold font-display text-sm">Senior Dignity</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Upholding independence and respect at all times.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-gold/20 bg-secondary/20 p-4 sm:col-span-2">
                <MapPin className="size-6 text-gold shrink-0" />
                <div>
                  <h4 className="font-bold font-display text-sm">Kolkata-Based</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Proudly serving seniors and families across Kolkata.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
