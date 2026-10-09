import { Metadata } from "next"
import { Suspense } from "react"
import { VerifyEmailForm } from "./verify-email-form"

export const metadata: Metadata = {
  title: "Verify Email | Sunshine Eldercare",
  description: "Verify your email address for Sunshine Eldercare.",
}

export default function VerifyEmailPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary/50 paper-texture px-5 py-24 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-gold/40 bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Verify Your Email</h1>
          <p className="mt-2 font-serif text-foreground/70">
            Please enter the 6-digit code sent to your email.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse bg-gold/10 rounded-xl" />}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  )
}
