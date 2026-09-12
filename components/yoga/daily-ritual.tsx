import { Sunrise, Wind, Activity, Soup, Moon } from 'lucide-react'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

const ritual = [
  {
    time: '08:00 · Morning',
    title: 'Good Morning Check-in',
    desc: 'A friendly call or visit to ensure a cheerful start to the day and confirm medication compliance.',
    icon: Sunrise,
  },
  {
    time: '11:00 · Midday',
    title: 'Physiotherapy & Wellness',
    desc: 'Guided mobility exercises tailored to improve strength and maintain joint health.',
    icon: Activity,
  },
  {
    time: '13:00 · Afternoon',
    title: 'Nutritional Support',
    desc: 'Assistance with healthy meal planning and ensuring proper dietary intake.',
    icon: Soup,
  },
  {
    time: '16:00 · Evening',
    title: 'Companionship & Leisure',
    desc: 'Engaging in reading, games, or a gentle walk in the park to keep spirits high.',
    icon: Wind,
  },
  {
    time: '20:00 · Night',
    title: 'Evening Health Vitals',
    desc: 'Checking blood pressure, sugar levels, and ensuring a peaceful, safe transition to rest.',
    icon: Moon,
  },
]

export function DailyRitual() {
  return (
    <section className="relative overflow-hidden bg-brown py-24 text-ivory sm:py-32">
      {/* Moving sunlight */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[140%] w-[140%] -translate-x-1/2 opacity-60"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(217,119,6,0.35), transparent 55%)',
            animation: 'float-soft 9s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow className="text-gold">A Day with Sunshine</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance font-display text-3xl font-bold leading-tight text-ivory sm:text-5xl">
            Moments of Care
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty font-serif text-lg text-ivory/75">
            From the morning check-in to evening vitals — a day structured around health, happiness, and peace of mind.
          </p>
        </Reveal>

        <ol className="relative mt-16">
          {/* timeline spine */}
          <span className="absolute bottom-0 left-6 top-2 w-px bg-gradient-to-b from-gold via-primary to-maroon/40 sm:left-8" />
          {ritual.map((r, i) => {
            const Icon = r.icon
            return (
              <Reveal as="li" key={r.title} delay={i * 90} className="relative mb-10 pl-16 sm:pl-24">
                <span className="absolute left-0 top-0 flex size-12 items-center justify-center rounded-full border border-gold/50 bg-brown shadow-lg sm:size-16">
                  <Icon className="size-5 text-gold sm:size-7" />
                </span>
                <p className="text-sm uppercase tracking-[0.25em] text-gold">
                  {r.time}
                </p>
                <h3 className="mt-1.5 font-display text-xl font-bold text-ivory sm:text-2xl">
                  {r.title}
                </h3>
                <p className="mt-2 font-serif text-lg leading-relaxed text-ivory/75">
                  {r.desc}
                </p>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
