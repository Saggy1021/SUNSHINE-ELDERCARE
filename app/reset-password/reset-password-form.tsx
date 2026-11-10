'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { resetPassword } from '@/app/actions/auth'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Guard against missing token or email
  if (!token || !email) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Invalid Reset Link</h2>
          <p className="mt-2 text-sm text-foreground/70">
            This password reset link is invalid or incomplete. Please request a new password reset link.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5"
          >
            Request New Reset Link
          </Link>
        </div>
        <div className="text-center text-sm text-foreground/70">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isPending) return

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password.length > 128) {
      setError('Password must not exceed 128 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords are identical.')
      return
    }

    setIsPending(true)
    setError(null)

    try {
      const res = await resetPassword({
        token,
        email,
        password,
        confirmPassword,
      })

      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || 'Failed to reset password. The link may have expired.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Password Updated</h2>
          <p className="mt-2 text-sm text-foreground/70">
            Your password has been reset successfully. You can now sign in with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login?reset=success"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5"
          >
            Sign In with New Password
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
          htmlFor="email-display"
          className="mb-1.5 block text-sm font-medium text-foreground/80"
        >
          Account
        </label>
        <input
          id="email-display"
          type="email"
          disabled
          value={email}
          className="w-full rounded-xl border border-input bg-secondary/50 px-4 py-3 font-serif text-base text-foreground/70 outline-none cursor-not-allowed"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-foreground/80"
        >
          New Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            disabled={isPending}
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-11 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isPending}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-foreground/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md transition-colors disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-foreground/60">Minimum 8 characters (max 128)</p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-sm font-medium text-foreground/80"
        >
          Confirm New Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            disabled={isPending}
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-11 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            disabled={isPending}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-foreground/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md transition-colors disabled:opacity-50"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            title={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || password.length < 8 || !confirmPassword}
        className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        <span>{isPending ? 'Updating Password...' : 'Update Password'}</span>
      </button>

      <div className="mt-2 text-center text-sm text-foreground/70">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Cancel and Return to Sign In
        </Link>
      </div>
    </form>
  )
}

