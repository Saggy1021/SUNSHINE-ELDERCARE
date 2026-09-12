'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowDown } from 'lucide-react'
import { FloatingPetals } from './floating-petals'

export function Hero() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Parallax Sunrise Composition */}
      <div
        className="absolute inset-0 scale-110"
        style={{ transform: `translateY(${offset * 0.35}px) scale(1.1)` }}
      >
        {/* ================= LAYER 1: BACKGROUND MOUNTAIN ================= */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/images/bright-sunrise.jpg')] bg-cover bg-[center_30%]" />
          {/* Sky transition: soft pale blue/white -> transparent to blend with content */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#E6EEF5]/40 via-white/10 to-transparent pointer-events-none" />
        </div>

        {/* ================= LAYER 2 & 3: RISING SUNRISE GROUP ================= */}
        {/* We group the Rays, Glow, and Emblem together so they are perfectly centered on the same axis */}
        <div className="absolute inset-0 z-20 flex items-center justify-end pointer-events-none mt-[15vh] pr-[5%] lg:pr-[10%]">
          <div className="relative flex items-center justify-center h-[350px] w-[350px] sm:h-[450px] sm:w-[450px] lg:h-[550px] lg:w-[550px] animate-sunrise-logo">
            
            {/* 1. Warm Glow (Behind Emblem) - True intense sunrise core */}
            <div className="absolute h-[800px] w-[1000px] opacity-0 animate-[sunrise-glow_3.0s_ease-in-out_0.0s_both] mix-blend-screen pointer-events-none">
              {/* Massive outer warm halo bleeding into the sky */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,230,170,0.5),transparent_65%)] blur-3xl" />
              {/* Extremely bright, white-hot inner core that burns through the transparent logo */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),rgba(255,245,210,0.9)_25%,transparent_50%)] blur-2xl" />
            </div>

            {/* 2. Rays (Behind Emblem) - Layered organic sunlight */}
            <div className="absolute h-[1100px] w-[1100px] opacity-0 animate-[sunrise-rays_3.0s_ease-out_0.0s_both] mix-blend-screen pointer-events-none">
              <div className="absolute inset-0 sun-rays-long opacity-100" />
              <div className="absolute inset-0 sun-rays-medium opacity-100" />
              <div className="absolute inset-0 sun-rays-short opacity-100" />
            </div>

            {/* 3. Emblem with Local Atmospheric Haze */}
            <div className="relative h-full w-full z-10">
              <Image
                src="/images/emblem-transparent.png"
                alt="Sunshine Emblem"
                aria-hidden="true"
                fill
                priority
                className="object-contain"
              />
              {/* Very subtle cloud diffusion haze strictly at the bottom intersecting the mountain */}
              <div className="absolute inset-x-0 -bottom-10 h-[40%] bg-gradient-to-t from-[#FFF0D4]/80 via-[#FFF8EB]/40 to-transparent blur-xl mix-blend-screen pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ================= LAYER 4: NATURAL FOREGROUND MOUNTAIN OCCLUSION ================= */}
        {/* Uses a procedurally extracted transparent PNG of the actual foreground mountain ridge.
            This creates a 100% natural, curved occlusion boundary for the rising sun. */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute inset-0 bg-[url('/images/bright-sunrise-foreground.png')] bg-cover bg-[center_30%]" />
        </div>

        {/* ================= LAYER 5: ATMOSPHERE & PETALS ================= */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Incense smoke */}
          <div className="absolute bottom-0 left-1/4 h-72 w-24">
            <span
              className="absolute bottom-0 left-1/2 h-40 w-6 -translate-x-1/2 rounded-full bg-ivory/40 blur-xl"
              style={{ animation: 'smoke-rise 9s ease-in infinite' }}
            />
          </div>
          <FloatingPetals count={15} />
        </div>
      </div>

      {/* ================= LAYER 6: TEXT CONTENT ================= */}
      <div className="relative z-50 w-full max-w-7xl mx-auto px-6 lg:px-8 opacity-0 animate-[welcome-content_1s_ease-out_2.5s_both] mt-32">
        <div className="max-w-xl text-left">
          <h1 className="flex flex-col font-display text-5xl font-bold text-primary drop-shadow-md sm:text-7xl lg:text-8xl">
            <span className="block text-primary">SUNSHINE</span>
            <span className="block mt-2 text-3xl tracking-[0.2em] text-primary/90 sm:text-4xl lg:text-5xl">ELDER CARE</span>
          </h1>
          <p className="mt-6 text-pretty font-serif text-xl italic leading-relaxed text-foreground/85 drop-shadow-sm sm:text-2xl">
            Compassionate care for your loved ones. We provide comprehensive, personalized care options to ensure the well-being, safety, and dignity of seniors.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="/membership"
              className="w-full rounded-full bg-primary px-8 py-3.5 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto text-center"
            >
              Explore Care Plans
            </a>
            <a
              href="/contact-us"
              className="w-full rounded-full border border-primary/20 bg-white/10 px-8 py-3.5 text-base font-medium text-primary backdrop-blur-sm transition-all hover:bg-white/20 hover:-translate-y-0.5 sm:w-auto text-center"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      <a
        href="#programs"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-ivory/70 transition-colors hover:text-gold"
        aria-label="Scroll to discover"
      >
        <ArrowDown className="size-6 animate-bounce" />
      </a>
    </section>
  )
}
