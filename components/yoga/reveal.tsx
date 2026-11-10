'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section' | 'article'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [status, setStatus] = useState<'initial' | 'pending' | 'visible'>('initial')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // 1. Respect prefers-reduced-motion: leave content visible without animation
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    // 2. If IntersectionObserver is not supported, remain visible
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    // 3. Check if element is already within the viewport or above it
    const rect = el.getBoundingClientRect()
    const isAboveOrInView = rect.top < window.innerHeight && rect.bottom > 0
    const isPast = rect.bottom <= 0

    if (isAboveOrInView || isPast) {
      // Content is already in view on mount (e.g. above-the-fold or navigated anchor)
      // Keep in 'initial' state (opacity: 1) to avoid an abrupt flicker or jump to 0.
      return
    }

    // 4. Element is below the fold. Arm it for scroll reveal animation.
    setStatus('pending')

    let fallbackTimeout: NodeJS.Timeout

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            setStatus('visible')
            observer.unobserve(entry.target)
            clearTimeout(fallbackTimeout)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    
    observer.observe(el)

    // Defensive fallback: If 1500ms passes after arming and observer hasn't fired, ensure visibility
    fallbackTimeout = setTimeout(() => {
      setStatus('visible')
      if (el) observer.unobserve(el)
    }, 1500)

    return () => {
      observer.disconnect()
      clearTimeout(fallbackTimeout)
    }
  }, [])

  const Component = Tag as any
  return (
    <Component
      ref={ref}
      className={cn(
        'reveal',
        status === 'pending' && 'reveal-pending',
        status === 'visible' && 'is-visible',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  )
}
