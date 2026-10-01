import { Reveal } from './reveal'
import { ShieldAlert, MapPin, Ambulance, Hospital } from 'lucide-react'

export function EmergencyAssistance() {
  return (
    <section id="emergency-assistance" className="relative overflow-hidden bg-primary py-24 sm:py-32 text-primary-foreground">
      <div className="absolute inset-0 opacity-10 bg-[url('/images/pattern-bg.png')] bg-repeat" />
      
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 mb-6">
              <ShieldAlert className="size-5 text-gold" />
              <span className="text-sm font-bold uppercase tracking-wider text-gold">24/7 Support</span>
            </div>
            <h2 className="text-balance font-display text-4xl font-bold leading-tight sm:text-5xl text-ivory">
              24/7 Emergency Assistance
            </h2>
            <p className="mt-6 text-pretty font-serif text-lg leading-relaxed text-ivory/90">
              When a member reports an emergency, a Sunshine executive immediately proceeds to the member's location to assist. Our dedicated on-ground response team is always on standby, 24 hours a day, 7 days a week.
            </p>
            
            <div className="mt-8 rounded-2xl border border-gold/30 bg-primary-foreground/5 p-6 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold text-brown">
                  <span className="font-display text-xl font-bold">30</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ivory">30-Minute Target Response</h3>
                  <p className="mt-1 font-serif text-sm text-ivory/80">
                    We aim to reach the member's location within 30 minutes of the emergency being reported.*
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-primary-foreground/10 p-6 backdrop-blur-sm">
              <MapPin className="mb-4 size-8 text-gold" />
              <h3 className="font-display text-lg font-bold text-ivory">On-Ground Executive</h3>
              <p className="mt-2 font-serif text-sm text-ivory/80">
                Direct physical presence and assistance by trained Sunshine personnel at the location of the emergency.
              </p>
            </div>
            
            <div className="rounded-2xl bg-primary-foreground/10 p-6 backdrop-blur-sm">
              <Hospital className="mb-4 size-8 text-gold" />
              <h3 className="font-display text-lg font-bold text-ivory">Hospital Assistance</h3>
              <p className="mt-2 font-serif text-sm text-ivory/80">
                If required, our executive will assist by taking the member to a hospital according to the member's authorization.
              </p>
            </div>

            <div className="rounded-2xl bg-primary-foreground/10 p-6 backdrop-blur-sm sm:col-span-2">
              <Ambulance className="mb-4 size-8 text-gold" />
              <h3 className="font-display text-lg font-bold text-ivory">Ambulance Coordination</h3>
              <p className="mt-2 font-serif text-sm text-ivory/80">
                Sunshine has ambulance services available within its service ecosystem, rapidly coordinated when transport is necessary.
              </p>
            </div>
          </Reveal>
        </div>
        
        <Reveal delay={200} className="mt-12 text-center border-t border-gold/20 pt-6">
          <p className="text-xs text-ivory/60 font-serif">
            * Actual response time may be affected by traffic, accessibility, weather, and circumstances beyond our reasonable control.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
