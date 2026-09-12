import { cn } from '@/lib/utils'

/* A geometric mandala used as a rotating background motif. */
export function Mandala({ className }: { className?: string }) {
  const petals = Array.from({ length: 24 })
  const ring2 = Array.from({ length: 16 })
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn('text-gold', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="96" />
      <circle cx="100" cy="100" r="78" />
      <circle cx="100" cy="100" r="46" />
      <circle cx="100" cy="100" r="24" />
      <circle cx="100" cy="100" r="10" />
      {petals.map((_, i) => (
        <g key={i} transform={`rotate(${(360 / 24) * i} 100 100)`}>
          <path d="M100 4 C108 24 108 40 100 54 C92 40 92 24 100 4 Z" />
        </g>
      ))}
      {ring2.map((_, i) => (
        <g key={i} transform={`rotate(${(360 / 16) * i} 100 100)`}>
          <path d="M100 54 C105 66 105 72 100 80 C95 72 95 66 100 54 Z" />
          <circle cx="100" cy="46" r="1.6" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  )
}

/* A single lotus glyph. */
export function Lotus({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={cn('text-gold', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M32 6 C29 16 29 26 32 34 C35 26 35 16 32 6 Z" />
      <path d="M32 34 C24 30 18 22 17 12 C26 14 31 22 32 34 Z" />
      <path d="M32 34 C40 30 46 22 47 12 C38 14 33 22 32 34 Z" />
      <path d="M32 34 C20 34 9 30 2 23 C13 22 25 26 32 34 Z" />
      <path d="M32 34 C44 34 55 30 62 23 C51 22 39 26 32 34 Z" />
    </svg>
  )
}

/* Ornate divider placed between sections. */
export function LotusDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4 py-10 text-gold/70',
        className,
      )}
      aria-hidden="true"
    >
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60 sm:w-28" />
      <svg viewBox="0 0 24 24" className="size-3 fill-gold/70">
        <circle cx="12" cy="12" r="6" />
      </svg>
      <Lotus className="h-6 w-auto" />
      <svg viewBox="0 0 24 24" className="size-3 fill-gold/70">
        <circle cx="12" cy="12" r="6" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60 sm:w-28" />
    </div>
  )
}

/* Small eyebrow label with flanking strokes. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.35em] text-primary',
        className,
      )}
    >
      <span className="h-px w-8 bg-gold/70" />
      {children}
      <span className="h-px w-8 bg-gold/70" />
    </span>
  )
}
