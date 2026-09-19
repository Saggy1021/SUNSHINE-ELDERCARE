'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Lotus } from './ornaments'

const links = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Services', href: '/services' },
  { label: 'Moments of Care', href: '/moments-of-care' },
  { label: 'Membership', href: '/membership' },
  { label: 'FAQs', href: '/faqs' },
]

export function Navbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-gold/25 bg-background/85 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a
          href="/"
          className={cn(
            'flex items-center gap-2.5 transition-colors',
            scrolled ? 'text-foreground' : 'text-ivory',
          )}
        >
          <div className="relative h-12 w-[170px] sm:h-14 sm:w-[200px] lg:h-16 lg:w-[220px]">
            <Image 
              src="/images/logo-new.png" 
              alt="Sunshine Elder Care Logo"
              fill
              priority
              sizes="(max-width: 640px) 170px, (max-width: 1024px) 200px, 220px"
              className="object-contain object-left" 
            />
          </div>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium tracking-wide text-gold/90 transition-all hover:text-gold hover:underline hover:underline-offset-4"
            >
              {l.label}
            </a>
          ))}
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              My Portal
            </a>
          ) : (
            <div className="flex items-center gap-4">
              <a
                href="/login"
                className="text-sm font-medium tracking-wide text-gold/90 transition-all hover:text-gold hover:underline hover:underline-offset-4"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Sign Up
              </a>
            </div>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'lg:hidden transition-colors',
            scrolled ? 'text-gold' : 'text-gold/90',
          )}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-gold/20 bg-background/95 px-6 py-6 backdrop-blur-md lg:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-serif text-lg font-medium text-gold/90 transition-colors hover:text-gold"
              >
                {l.label}
              </a>
            ))}
            {isAuthenticated ? (
              <a
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-medium text-primary-foreground"
              >
                My Portal
              </a>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                <a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-gold/50 px-5 py-2.5 text-center text-sm font-medium text-gold transition-colors hover:bg-gold/10"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-primary px-5 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Sign Up
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
