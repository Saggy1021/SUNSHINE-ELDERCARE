import { Reveal } from './reveal'
import { Eyebrow, LotusDivider } from './ornaments'

const limbs = [
  {
    n: 'I',
    name: 'ERC',
    sanskrit: 'Response',
    short: 'Essential Response Care',
    deep: 'Immediate medical and non-medical response tailored for senior emergencies.',
  },
  {
    n: 'II',
    name: 'TrueCare',
    sanskrit: 'Companion',
    short: 'Continuous Support',
    deep: 'Continuous daily assistance, emotional support, and routine medical coordination.',
  },
  {
    n: 'III',
    name: 'Pulse Care+',
    sanskrit: 'Health',
    short: 'Advanced Tracking',
    deep: 'Advanced health tracking, doctor visits, and full-spectrum eldercare support.',
  },
  {
    n: 'IV',
    name: 'EasyClaim',
    sanskrit: 'Finance',
    short: 'Expense Care',
    deep: 'Assistance for bill payments, insurance claims, and related paperwork.',
  },
  {
    n: 'V',
    name: 'Transition',
    sanskrit: 'Recovery',
    short: 'Post-Hospital Care',
    deep: 'Seamless transition care from hospital to home ensuring quick recovery.',
  }
]

export function EightLimbs() {
  return (
    <section
      id="limbs"
      className="relative overflow-hidden bg-secondary/50 py-24 paper-texture sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
        <Reveal>
          <Eyebrow>Comprehensive Care · Programs</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Our Care Programs
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Structured programs designed to provide the exact level of support, medical attention, and companionship your loved ones need.
          </p>
        </Reveal>
      </div>

      {/* Horizontal timeline */}
      <div className="mt-14 overflow-x-auto pb-6">
        <div className="mx-auto flex w-max gap-5 px-5 sm:px-8">
          {limbs.map((limb, i) => (
            <Reveal key={limb.name} delay={i * 70}>
              <article className="group relative h-72 w-60 overflow-hidden rounded-2xl border border-gold/35 bg-card p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">
                <div className="absolute right-4 top-3 font-display text-5xl font-bold text-gold/20 transition-colors group-hover:text-gold/35">
                  {limb.n}
                </div>
                <p className="font-serif text-3xl text-primary italic">
                  {limb.sanskrit}
                </p>
                <h3 className="mt-3 font-display text-xl font-bold">
                  {limb.name}
                </h3>
                <p className="mt-1 text-sm uppercase tracking-wider text-muted-foreground">
                  {limb.short}
                </p>

                <p className="mt-4 font-serif text-base leading-relaxed text-foreground/70 opacity-0 transition-all duration-500 group-hover:opacity-100">
                  {limb.deep}
                </p>

                <span className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-primary to-gold transition-transform duration-500 group-hover:scale-x-100" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      <LotusDivider />
    </section>
  )
}
