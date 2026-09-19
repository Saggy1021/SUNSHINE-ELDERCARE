'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerUser } from '@/app/actions/auth'
import { signIn } from 'next-auth/react'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Validate callback url to prevent open redirects
  const rawCallback = searchParams.get('callbackUrl')
  const callbackUrl = rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//')
    ? rawCallback
    : '/dashboard'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await registerUser(formData)

      if (!result.success) {
        setError(result.error || "Failed to create account")
        setLoading(false)
        return
      }

      // Auto login after signup
      const signInResult = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (signInResult?.error) {
        // Fallback to login page if auto-login fails
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-medium text-foreground/80"
        >
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Maya Sharma"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      
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
          placeholder="you@example.com"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          minLength={8}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>

      <div className="mt-2 text-center text-sm text-foreground/70">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </a>
      </div>
    </form>
  )
}
