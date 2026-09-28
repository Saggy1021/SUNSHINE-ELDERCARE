import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'

const gurus = [
  {
    name: 'Dr. Ananya Roy',
    title: 'Lead Geriatric Physician',
    image: '/images/guru-1.png',
    bio: 'With over two decades of experience in senior health, Dr. Roy leads our medical coordination and emergency response strategies.',
    quote: 'True care is treating the person, not just the symptoms.',
  },
  {
    name: 'Suresh Kumar',
    title: 'Head of Companionship',
    image: '/images/guru-2.png',
    bio: 'Suresh trains our companion network, ensuring every caregiver brings empathy, patience, and warmth to your loved ones.',
    quote: 'A listening ear is often the best medicine.',
  },
  {
    name: 'Priya Sharma',
    title: 'Senior Physiotherapist',
    image: '/images/guru-3.png',
    bio: 'Priya specializes in non-invasive, home-based physical therapy designed to improve mobility and reduce pain in seniors.',
    quote: 'Movement is life, and every small step counts.',
  },
]

export function Gurus({ employees }: { employees?: any[] }) {
  const displayGurus = employees && employees.length > 0
    ? employees.map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        title: e.designation,
        image: e.photoReference || '/placeholder.svg',
        bio: e.publicBiography || '',
        quote: '', // No quote in Employee model, left empty to preserve design structurally
      }))
    : gurus;

  return (
    <section id="gurus" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Meet Our Team</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Our Care Experts
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Compassionate professionals dedicated to the health, dignity, and happiness of your loved ones.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {displayGurus.map((g, i) => (
            <Reveal key={g.name + i} delay={i * 110}>
              <article className="group h-full overflow-hidden rounded-[1.75rem] border border-gold/35 bg-card shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl">
                <div className="relative overflow-hidden">
                  <img
                    src={g.image || '/placeholder.svg'}
                    alt={`Portrait of ${g.name}`}
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brown/80 via-brown/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="font-display text-2xl font-bold text-ivory text-shadow-warm">
                      {g.name}
                    </h3>
                    <p className="mt-1 text-sm uppercase tracking-wider text-gold">
                      {g.title}
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="font-serif text-lg leading-relaxed text-foreground/80">
                    {g.bio}
                  </p>
                  {g.quote && (
                    <blockquote className="mt-5 border-l-2 border-primary pl-4 font-serif text-lg italic text-primary">
                      “{g.quote}”
                    </blockquote>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
