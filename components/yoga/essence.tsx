import { Reveal } from './reveal'
import { Eyebrow, Mandala } from './ornaments'

export function Essence() {
  return (
    <section id="essence" className="relative overflow-hidden py-24 sm:py-32">
      <Mandala className="animate-spin-slower pointer-events-none absolute -right-40 top-10 h-96 w-96 opacity-[0.07]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Image with manuscript framing */}
        <Reveal className="relative">
          <div className="relative overflow-hidden rounded-[2rem] heritage-border">
            <img
              src="/images/essence-manuscript.png"
              alt="A yogi meditating at sunrise in an ancient Indian ashram courtyard"
              className="aspect-[4/5] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brown/30 to-transparent" />
          </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-gold/40 bg-card px-6 py-4 shadow-lg sm:block">
              <p className="font-serif text-3xl italic text-primary">24/7</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Compassionate Care
              </p>
            </div>
        </Reveal>

        {/* Story */}
        <Reveal delay={120} className="max-w-xl">
          <Eyebrow>The Sunshine Philosophy</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Reimagining senior care with compassion and dignity
          </h2>
          <div className="mt-6 space-y-5 font-serif text-lg leading-relaxed text-foreground/80">
            <p>
              At Sunshine Elder Care, we believe that aging is a privilege to be celebrated. Our approach is rooted in providing not just medical assistance, but genuine companionship and holistic well-being.
            </p>
            <p>
              We stand by our commitment to ensure that your loved ones never feel alone. From routine health check-ups to emergency response and daily errands, we provide a complete ecosystem of care.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-gold/30 pt-8">
            {[
              { k: '24/7', v: 'Availability' },
              { k: '3+', v: 'Care Programs' },
              { k: '100%', v: 'Commitment' },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-display text-2xl font-bold text-primary sm:text-3xl">
                  {s.k}
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
