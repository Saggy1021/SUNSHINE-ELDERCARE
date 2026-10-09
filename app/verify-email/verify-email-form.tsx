'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyEmail, resendVerificationEmail } from '@/app/actions/auth'
import Link from 'next/link'

export function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const callbackUrl = searchParams.get('callbackUrl') || '/login'
  
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) {
      setError("Email address is missing. Please sign up again.")
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await verifyEmail(email, otp)

      if (result.success) {
        setSuccess("Email verified successfully! Redirecting...")
        setTimeout(() => {
          router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
        }, 1500)
      } else {
        setError(result.error || "Invalid or expired OTP.")
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    setError(null)
    setSuccess(null)
    
    try {
      const result = await resendVerificationEmail(email)
      if (result.success) {
        setSuccess("A new OTP has been sent to your email.")
        setCooldown(60)
      } else {
        setError(result.error || "Failed to resend OTP.")
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 border border-green-500/20">
          {success}
        </div>
      )}

      {email && (
        <div className="text-center text-sm text-foreground/80 font-medium bg-secondary/30 p-2 rounded-lg">
          Verifying: {email}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-foreground/80">
            6-Digit Verification Code
          </label>
          <input
            id="otp"
            name="otp"
            type="text"
            required
            maxLength={6}
            pattern="\d{6}"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full text-center tracking-widest text-2xl rounded-xl border border-input bg-background px-4 py-3 font-serif outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6 || !email}
          className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className="mt-2 text-center text-sm text-foreground/70">
        Didn't receive the code?{' '}
        <button 
          onClick={handleResend}
          disabled={cooldown > 0 || !email}
          className="font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
        </button>
      </div>

      <div className="text-center text-sm text-foreground/70">
        <Link href="/signup" className="hover:underline">
          Return to Sign Up
        </Link>
      </div>
    </div>
  )
}
