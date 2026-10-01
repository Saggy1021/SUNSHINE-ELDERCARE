import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

export function Certifications() {
  return (
    <section id="certifications" className="relative overflow-hidden bg-secondary/30 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Recognised & Certified</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-2xl font-bold leading-tight sm:text-4xl">
            Trusted by the Highest Standards
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {/* MSME */}
          <Reveal delay={0}>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gold/30 bg-card p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="font-display font-bold text-xl">MSME</span>
              </div>
              <h3 className="font-display text-lg font-bold">Udyam Registered Enterprise</h3>
              <p className="mt-2 font-serif text-sm text-muted-foreground">Micro Enterprise</p>
              <p className="mt-4 text-xs font-mono text-muted-foreground">UDYAM-WB-10-0225763</p>
            </div>
          </Reveal>

          {/* ISO */}
          <Reveal delay={100}>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gold/30 bg-card p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="font-display font-bold text-xl">ISO</span>
              </div>
              <h3 className="font-display text-lg font-bold">ISO 9001:2015 Certified</h3>
              <p className="mt-2 font-serif text-sm text-muted-foreground">Quality Management System</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Eldercare support services & social work activities without accommodation for elderly and disabled persons.
              </p>
            </div>
          </Reveal>

          {/* IAF */}
          <Reveal delay={200}>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gold/30 bg-card p-8 text-center shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="font-display font-bold text-xl">IAF</span>
              </div>
              <h3 className="font-display text-lg font-bold">Accredited Certification</h3>
              <p className="mt-2 font-serif text-sm text-muted-foreground">
                Committed to delivering accountable and standardized care operations.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
