'use client'

import { useEffect, useState } from 'react'

type Petal = {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  hue: number
}

/* Lotus petals slowly drifting down the screen for warm ambient movement. */
export function FloatingPetals({ count = 14 }: { count?: number }) {
  // Generate only on the client after mount to avoid SSR hydration mismatch.
  const [petals, setPetals] = useState<Petal[]>([])

  useEffect(() => {
    setPetals(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 10 + Math.random() * 18,
        duration: 14 + Math.random() * 16,
        delay: -Math.random() * 30,
        hue: i % 3,
      })),
    )
  }, [count])

  const colors = ['#d97706', '#c65d2e', '#d4a017']

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        >
          <svg
            width={p.size}
            height={p.size}
            viewBox="0 0 24 24"
            style={{ opacity: 0.5 }}
          >
            <path
              d="M12 2 C16 8 16 16 12 22 C8 16 8 8 12 2 Z"
              fill={colors[p.hue]}
            />
          </svg>
        </span>
      ))}
    </div>
  )
}
