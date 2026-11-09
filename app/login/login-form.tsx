'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { requestLoginOtp } from '@/app/actions/auth'

type AuthState = 'idle' | 'submitting' | 'authenticating' | 'redirecting' | 'completed'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [state, setState] = useState<AuthState>('idle')

  // OTP-specific states
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Validate callback url to prevent open redirects (including protocol-relative and backslash bypasses)
  const rawCallback = searchParams.get('callbackUrl')
  const isValidCallback = rawCallback && 
    rawCallback.startsWith('/') && 
    !rawCallback.startsWith('//') && 
    !rawCallback.startsWith('/\\')
  
  const callbackUrl = isValidCallback ? rawCallback : '/dashboard'
  const isPending = state !== 'idle'

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Password submission
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isPending) return

    setState('submitting')
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      setState('authenticating')
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        authType: 'password',
      })

      if (result?.error || !result?.ok) {
        if (result?.error?.includes('Too many login attempts')) {
          setError("Too many login attempts. Please try again later.")
        } else {
          setError("Invalid email or password.")
        }
        setState('idle')
      } else {
        setState('redirecting')
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('Too many login attempts')) {
        setError("Too many login attempts. Please try again later.")
      } else {
        setError("Invalid email or password.")
      }
      setState('idle')
    }
  }

  // Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!otpEmail || cooldown > 0 || isPending) return

    setState('submitting')
    setError(null)
    setSuccess(null)

    try {
      const res = await requestLoginOtp(otpEmail)
      if (res.success) {
        setOtpSent(true)
        setSuccess(res.message || "A 6-digit login code has been sent to your email.")
        setCooldown(60)
      } else {
        setError(res.error || "Failed to send login code. Please try again.")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send login code.")
    } finally {
      setState('idle')
    }
  }

  // Verify OTP submission
  const handleOtpVerifySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!otpEmail || otpCode.length !== 6 || isPending) return

    setState('authenticating')
    setError(null)
    setSuccess(null)

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: otpEmail,
        otp: otpCode,
        authType: 'otp',
      })

      if (result?.error || !result?.ok) {
        if (result?.error?.includes('expired')) {
          setError("Your login code has expired. Please request a new code.")
        } else if (result?.error?.includes('Too many')) {
          setError("Too many attempts. Your code was invalidated. Please request a new code.")
        } else {
          setError("Invalid login code. Please verify the 6-digit code and try again.")
        }
        setState('idle')
      } else {
        setState('redirecting')
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('expired')) {
        setError("Your login code has expired. Please request a new code.")
      } else if (message.includes('Too many')) {
        setError("Too many attempts. Your code was invalidated. Please request a new code.")
      } else {
        setError("Invalid login code. Please verify and try again.")
      }
      setState('idle')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Auth Mode Toggle */}
      <div className="grid grid-cols-2 rounded-xl bg-secondary/80 p-1 border border-border/40">
        <button
          type="button"
          onClick={() => {
            setAuthMode('password')
            setError(null)
            setSuccess(null)
          }}
          className={`rounded-lg py-2 text-sm font-medium transition-all ${
            authMode === 'password'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('otp')
            setError(null)
            setSuccess(null)
          }}
          className={`rounded-lg py-2 text-sm font-medium transition-all ${
            authMode === 'otp'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          Email OTP
        </button>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 border border-green-500/20"
        >
          {success}
        </div>
      )}

      {authMode === 'password' ? (
        /* PASSWORD LOGIN FORM */
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5" aria-busy={isPending}>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              disabled={isPending}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              disabled={isPending}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            <span>{isPending ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>
      ) : (
        /* OTP LOGIN FORM */
        <div>
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-5" aria-busy={isPending}>
              <div>
                <label
                  htmlFor="otpEmail"
                  className="mb-1.5 block text-sm font-medium text-foreground/80"
                >
                  Email Address
                </label>
                <input
                  id="otpEmail"
                  name="otpEmail"
                  type="email"
                  required
                  disabled={isPending}
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !otpEmail}
                className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                <span>{isPending ? 'Sending Code...' : 'Send Login Code'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerifySubmit} className="flex flex-col gap-5" aria-busy={isPending}>
              <div className="flex items-center justify-between text-xs text-foreground/70">
                <span>Code sent to <strong>{otpEmail}</strong></span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setOtpSent(false)
                    setOtpCode('')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Change email
                </button>
              </div>

              <div>
                <label
                  htmlFor="otpCode"
                  className="mb-1.5 block text-sm font-medium text-foreground/80"
                >
                  6-Digit Login Code
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  disabled={isPending}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-foreground/60">Code expires in 5 minutes.</p>
              </div>

              <button
                type="submit"
                disabled={isPending || otpCode.length !== 6}
                className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                <span>{isPending ? 'Verifying...' : 'Verify & Sign In'}</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  disabled={isPending || cooldown > 0}
                  onClick={() => handleRequestOtp()}
                  className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="mt-2 text-center text-sm text-foreground/70">
        Don't have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}
