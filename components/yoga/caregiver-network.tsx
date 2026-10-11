'use client'

import { useState, useEffect, useRef } from 'react'
import { Reveal } from './reveal'
import { Eyebrow, Mandala } from './ornaments'
import {
  ShieldCheck,
  CheckCircle2,
  Stethoscope,
  Activity,
  Heart,
  ClipboardCheck,
  RotateCw,
  Star,
  ArrowRight,
  Clock,
  Sparkles,
  PhoneCall,
} from 'lucide-react'

interface CaregiverCardData {
  id: string
  title: string
  subtitle: string
  motto: string
  category: string
  image: string
  icon: typeof Stethoscope
  badge: string
  rating: string
  reviews: string
  bulletPoints: string[]
  credentials: {
    qualification: string
    verification: string
    supervision: string
    availability: string
  }
}

const caregiverCards: CaregiverCardData[] = [
  {
    id: 'diagnostics',
    title: 'At-Home Diagnostics',
    subtitle: 'Reliable Diagnostics Closer to Care',
    motto: 'Health Checks Today, Brighter Tomorrows',
    category: 'Diagnostics & Vitals',
    image: '/images/caregiver-diagnostics.jpg',
    icon: Stethoscope,
    badge: 'Certified Phlebotomy Care',
    rating: '4.95',
    reviews: '140+ visits',
    bulletPoints: [
      'Gentle at-home blood & diagnostic sample collection',
      'Routine vitals (BP, Blood Glucose, SpO2 & ECG)',
      'Digital reports synced directly to family portal',
    ],
    credentials: {
      qualification: 'Certified Phlebotomists & NABL Lab Partners',
      verification: '100% Police Verified & Identity Authenticated',
      supervision: 'Strict sterile cold-chain transport protocol',
      availability: 'Same-day morning collection across Kolkata',
    },
  },
  {
    id: 'physiotherapy',
    title: 'Physiotherapy & Mobility',
    subtitle: 'Move Better, Live Brighter',
    motto: 'Stronger Steps, Happier Days',
    category: 'Rehab & Physical Therapy',
    image: '/images/caregiver-physiotherapy.jpg',
    icon: Activity,
    badge: 'Licensed Physiotherapists',
    rating: '4.98',
    reviews: '260+ sessions',
    bulletPoints: [
      'Tailored resistance band, posture & mobility training',
      'Post-operative joint, stroke & fall-risk rehab',
      'Weekly progress tracking & range-of-motion assessments',
    ],
    credentials: {
      qualification: 'BPT / MPT Degree Geriatric Physiotherapists',
      verification: 'Clinical Credential Audit & Background Cleared',
      supervision: 'Regular senior orthopedic consultant review',
      availability: 'Flexible daily or alternate-day home sessions',
    },
  },
  {
    id: 'bedside-nursing',
    title: 'Bedside Nursing Care',
    subtitle: 'A Brighter, Healthier Tomorrow',
    motto: 'Compassion, Care, Comfort Always',
    category: 'Attendant & Nursing Care',
    image: '/images/caregiver-bedside.jpg',
    icon: Heart,
    badge: 'Trained Geriatric Attendants',
    rating: '4.97',
    reviews: '320+ days',
    bulletPoints: [
      '12h & 24h assisted daily living (ADL) bedside care',
      'Medication administration & hydration monitoring',
      'Warm companionship, gentle bathing & hygiene care',
    ],
    credentials: {
      qualification: 'Certified Geriatric Nursing Assistants',
      verification: 'Comprehensive Police & Neighborhood Verified',
      supervision: 'Daily supervisor check-ins & wellness audits',
      availability: '12-hour day/night shifts & 24/7 live-in options',
    },
  },
  {
    id: 'care-management',
    title: 'Dedicated Care Coordination',
    subtitle: 'Good Health, Happier Tomorrows',
    motto: 'Caring, Connecting, Coordinating',
    category: 'Supervision & Management',
    image: '/images/caregiver-consultation.jpg',
    icon: ClipboardCheck,
    badge: 'Senior Care Managers',
    rating: '5.0',
    reviews: '500+ families',
    bulletPoints: [
      'Personalized comprehensive eldercare action plans',
      'EHR digital records & doctor appointment scheduling',
      'Weekly transparent briefings for overseas children',
    ],
    credentials: {
      qualification: 'Led by Retired Armed Forces Officers',
      verification: 'Military-Grade Discipline & Accountability',
      supervision: 'Direct single-point-of-contact care manager',
      availability: '24/7 emergency dispatch & on-demand coordination',
    },
  },
]

export function CaregiverNetwork() {
  const [activeCardId, setActiveCardId] = useState<string>(caregiverCards[0].id)
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [isHoveredSection, setIsHoveredSection] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-cycle through flashcards one after another unless user paused or actively hovering
  useEffect(() => {
    if (!autoPlay || isHoveredSection) return

    timerRef.current = setInterval(() => {
      setActiveCardId((prev) => {
        const currentIndex = caregiverCards.findIndex((c) => c.id === prev)
        const nextIndex = (currentIndex + 1) % caregiverCards.length
        return caregiverCards[nextIndex].id
      })
    }, 4000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoPlay, isHoveredSection])

  const toggleFlip = (cardId: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }))
  }

  return (
    <section
      id="caregiver-network"
      className="relative overflow-hidden bg-secondary/30 py-24 sm:py-32"
      onMouseEnter={() => setIsHoveredSection(true)}
      onMouseLeave={() => setIsHoveredSection(false)}
    >
      {/* Background Decorative Mandala */}
      <Mandala className="pointer-events-none absolute -right-36 -top-24 h-[30rem] w-[30rem] opacity-[0.04]" />
      <Mandala className="pointer-events-none absolute -left-36 -bottom-24 h-[30rem] w-[30rem] opacity-[0.03]" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center">
          <Reveal>
            <Eyebrow>Qualified · Verified · Compassionate</Eyebrow>
            <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
              Our Caregiver Marketplace
            </h2>
            <p className="mx-auto mt-5 max-w-2xl font-serif text-lg leading-relaxed text-foreground/80">
              Explore verified healthcare specialists and attendants dedicated to your family.
              Each professional undergoes our military-supervised qualification process before stepping into your home.
            </p>
          </Reveal>

          {/* Trust Guarantees Strip */}
          <Reveal delay={120} className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-primary">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-card px-3.5 py-1.5 shadow-sm">
                <ShieldCheck className="size-4 text-gold" />
                100% Police Verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-card px-3.5 py-1.5 shadow-sm">
                <CheckCircle2 className="size-4 text-gold" />
                Clinical Skill Qualification
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-card px-3.5 py-1.5 shadow-sm">
                <Sparkles className="size-4 text-gold" />
                Army Veteran Supervision
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-card px-3.5 py-1.5 shadow-sm">
                <Clock className="size-4 text-gold" />
                24/7 Family Hotline
              </span>
            </div>
          </Reveal>
        </div>

        {/* Interactive Flashcard Quick-Nav Bar */}
        <Reveal delay={200} className="mt-12">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-card/80 p-2 backdrop-blur-sm shadow-sm">
            {caregiverCards.map((card, idx) => {
              const isActive = activeCardId === card.id
              const Icon = card.icon
              return (
                <button
                  key={card.id}
                  onClick={() => setActiveCardId(card.id)}
                  onMouseEnter={() => setActiveCardId(card.id)}
                  className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-foreground/80 hover:bg-gold/10 hover:text-primary'
                  }`}
                  aria-label={`View ${card.title} flashcard`}
                >
                  <Icon className={`size-4 transition-transform group-hover:scale-110 ${isActive ? 'text-gold' : 'text-primary/70'}`} />
                  <span>
                    <span className="opacity-60 mr-1.5 font-mono text-[11px]">0{idx + 1}.</span>
                    {card.title}
                  </span>
                  {isActive && (
                    <span className="inline-block size-1.5 rounded-full bg-gold animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* Flashcards Grid with Staggered Entrance & Interactive Hover Sequence */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {caregiverCards.map((card, index) => {
            const isActive = activeCardId === card.id
            const isFlipped = !!flippedCards[card.id]
            const Icon = card.icon

            return (
              <Reveal key={card.id} delay={index * 140} className="h-full">
                <div
                  onMouseEnter={() => setActiveCardId(card.id)}
                  className={`group relative flex h-full flex-col rounded-[1.75rem] border bg-card transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
                    isActive
                      ? 'border-gold shadow-[0_12px_36px_-10px_rgba(176,138,74,0.35)] ring-2 ring-gold/40'
                      : 'border-gold/30 shadow-md hover:border-gold/60'
                  }`}
                >
                  {/* Active Indicator Top Notch */}
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm z-20">
                      Active Spotlight
                    </div>
                  )}

                  {!isFlipped ? (
                    /* FRONT OF FLASHCARD */
                    <div className="flex h-full flex-col p-4 sm:p-5">
                      {/* Photo Container */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gold/20 shadow-inner">
                        <img
                          src={card.image}
                          alt={card.motto}
                          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />

                        {/* Top Category Badge */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md shadow-sm border border-gold/30">
                            <Icon className="size-3 text-gold" />
                            {card.category}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
                            <Star className="size-3 fill-gold text-gold" />
                            {card.rating}
                          </span>
                        </div>

                        {/* Bottom Tagline from Photo */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                          <p className="font-serif text-xs italic tracking-wide text-sandstone/95 line-clamp-1">
                            &ldquo;{card.motto}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="mt-4 flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-lg font-bold text-primary leading-snug">
                              {card.title}
                            </h3>
                          </div>
                          <p className="mt-1 text-xs font-medium text-gold">
                            {card.subtitle}
                          </p>

                          {/* Bullet Services */}
                          <ul className="mt-4 space-y-2 text-xs font-serif text-foreground/80 leading-relaxed">
                            {card.bulletPoints.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <CheckCircle2 className="size-3.5 shrink-0 text-gold mt-0.5" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-5 pt-4 border-t border-gold/20 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {card.reviews}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFlip(card.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold transition-colors py-1 px-2 rounded-lg hover:bg-gold/10"
                            title="Flip to check verification credentials"
                          >
                            <span>Credentials</span>
                            <RotateCw className="size-3.5 text-gold transition-transform group-hover:rotate-180 duration-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* BACK OF FLASHCARD: VERIFICATION & CREDENTIAL SHEET */
                    <div className="flex h-full flex-col justify-between p-5 bg-gradient-to-b from-card to-secondary/40 rounded-[1.75rem]">
                      <div>
                        {/* Back Header */}
                        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-full bg-gold/15 text-gold">
                              <ShieldCheck className="size-4" />
                            </div>
                            <div>
                              <h4 className="font-display text-sm font-bold text-primary leading-tight">
                                {card.title}
                              </h4>
                              <p className="text-[10px] uppercase tracking-wider text-gold font-semibold">
                                Verified Profile
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFlip(card.id)}
                            className="rounded-full p-1.5 text-foreground/70 hover:bg-gold/15 hover:text-primary transition-colors"
                            title="Flip back to front"
                          >
                            <RotateCw className="size-3.5" />
                          </button>
                        </div>

                        {/* Credential Checks */}
                        <div className="mt-4 space-y-3 text-xs">
                          <div className="rounded-xl border border-gold/20 bg-background/60 p-2.5">
                            <p className="font-semibold text-primary text-[11px]">Qualification</p>
                            <p className="mt-0.5 text-foreground/80 font-serif leading-snug">
                              {card.credentials.qualification}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gold/20 bg-background/60 p-2.5">
                            <p className="font-semibold text-primary text-[11px]">Verification</p>
                            <p className="mt-0.5 text-foreground/80 font-serif leading-snug">
                              {card.credentials.verification}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gold/20 bg-background/60 p-2.5">
                            <p className="font-semibold text-primary text-[11px]">Supervision Protocol</p>
                            <p className="mt-0.5 text-foreground/80 font-serif leading-snug">
                              {card.credentials.supervision}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gold/20 bg-background/60 p-2.5">
                            <p className="font-semibold text-primary text-[11px]">Availability</p>
                            <p className="mt-0.5 text-foreground/80 font-serif leading-snug">
                              {card.credentials.availability}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Request CTA Button */}
                      <div className="mt-5 pt-3 border-t border-gold/20 flex flex-col gap-2">
                        <a
                          href="#contact"
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-terracotta active:scale-98"
                        >
                          <span>Request Specialist</span>
                          <ArrowRight className="size-3.5 text-gold" />
                        </a>
                        <button
                          type="button"
                          onClick={() => toggleFlip(card.id)}
                          className="text-center text-[11px] text-muted-foreground hover:text-primary transition-colors py-0.5"
                        >
                          ← Flip back to overview
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Bottom Marketplace Summary & CTA */}
        <Reveal delay={450} className="mt-16 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl border border-gold/30 bg-card/60 p-6 sm:p-8 backdrop-blur-sm shadow-sm">
            <h3 className="font-display text-xl font-bold text-primary">
              Looking for a custom care arrangement?
            </h3>
            <p className="mt-2 font-serif text-sm text-foreground/80 leading-relaxed">
              Every family is unique. Talk with our senior retired armed forces coordinators
              to match your parents with verified, trustworthy caregivers for home diagnostics, physical rehabilitation, or continuous nursing.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-terracotta hover:shadow-lg active:scale-95"
              >
                <span>Schedule a Care Consultation</span>
                <ArrowRight className="size-4 text-gold" />
              </a>
              <a
                href="tel:03369029114"
                className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/50 px-5 py-2.5 text-sm font-medium text-primary transition-all hover:bg-gold/10"
              >
                <PhoneCall className="size-4 text-gold" />
                <span>Call Care Desk: 033 6902 9114</span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
