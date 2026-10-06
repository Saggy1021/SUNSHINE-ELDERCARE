import { Reveal } from './reveal'
import { Eyebrow, LotusDivider } from './ornaments'

const notes = [
  {
    text: 'I arrived restless and left rooted. The morning practice by the Ganges changed the way I breathe — and the way I live.',
    name: 'Ananya M.',
    place: 'Mumbai',
    rotate: '-rotate-1',
  },
  {
    text: 'More than a retreat, it was a homecoming. The gurus teach not poses, but presence. I carry that stillness with me daily.',
    name: 'Daniel R.',
    place: 'Lisbon',
    rotate: 'rotate-1',
  },
  {
    text: 'Every detail felt sacred — the lamps, the chanting, the silence before dawn. My heart still lives in that Himalayan light.',
    name: 'Keiko T.',
    place: 'Kyoto',
    rotate: '-rotate-2',
  },
]

export function Testimonials({ testimonials }: { testimonials?: any[] }) {
  const displayNotes = testimonials && testimonials.length > 0
    ? testimonials.map((t, i) => ({
        text: t.quote,
        name: t.authorName,
        place: t.authorTitle || '',
        rotate: ['-rotate-1', 'rotate-1', '-rotate-2'][i % 3]
      }))
    : notes;

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>From the Journal</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Pages from fellow travellers
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {displayNotes.map((n, i) => (
            <Reveal key={n.name + i} delay={i * 110}>
              <figure
                className={`relative rounded-sm bg-sandstone p-8 shadow-lg shadow-brown/15 paper-texture transition-all duration-500 ${n.rotate} hover:rotate-0 hover:-translate-y-2 hover:shadow-xl`}
              >
                {/* tape */}
                <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-1 bg-gold/30 backdrop-blur-sm" />
                <blockquote className="font-serif text-xl italic leading-relaxed text-brown">
                  “{n.text}”
                </blockquote>
                <figcaption className="mt-6 border-t border-brown/15 pt-4">
                  <p className="font-display text-lg font-bold text-brown">
                    {n.name}
                  </p>
                  <p className="text-sm text-brown/60">{n.place}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
      <LotusDivider />
    </section>
  )
}
