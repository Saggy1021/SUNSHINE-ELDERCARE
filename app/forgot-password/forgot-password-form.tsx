'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { requestPasswordReset } from '@/app/actions/auth'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isPending || !email) return

    setIsPending(true)
    setError(null)
    setMessage(null)

    try {
      const res = await requestPasswordReset(email)
      if (res.success) {
        setSubmitted(true)
        setMessage(
          res.message ||
            'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.'
        )
      } else {
        setError(res.error || 'Failed to request password reset. Please try again.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-7 w-7" aria-hidden="true" />
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold">Check Your Email</h2>
          <p className="mt-2 text-sm text-foreground/70">
            {message}
          </p>
          <p className="mt-2 text-xs text-foreground/60">
            The reset link expires in 1 hour. If you don&apos;t see it, be sure to check your spam or junk folder.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setEmail('')
              setError(null)
              setMessage(null)
            }}
            className="w-full rounded-full border border-primary/30 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Try another email address
          </button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={isPending}>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20"
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-foreground/80"
        >
          Registered Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        <p className="mt-1.5 text-xs text-foreground/60">
          We will send a secure single-use password reset link to this address.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending || !email}
        className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        <span>{isPending ? 'Sending Link...' : 'Send Reset Link'}</span>
      </button>

      <div className="mt-2 text-center text-sm text-foreground/70">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  )
}

