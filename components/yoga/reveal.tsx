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
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let fallbackTimeout: NodeJS.Timeout

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            setVisible(true)
            observer.unobserve(entry.target)
            clearTimeout(fallbackTimeout)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    
    observer.observe(el)

    // Fallback: If 600ms passes and it hasn't triggered, force it to be visible.
    // This is a defensive mechanism against Next.js cache restoration skipping the observer cycle.
    fallbackTimeout = setTimeout(() => {
      setVisible(true)
      if (el) observer.unobserve(el)
    }, 600)

    return () => {
      observer.disconnect()
      clearTimeout(fallbackTimeout)
    }
  }, [])

  const Component = Tag as any
  return (
    <Component
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  )
}
