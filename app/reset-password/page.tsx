import { Metadata } from "next"
import { Suspense } from "react"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password | Sunshine Eldercare",
  description: "Set a new password for your Sunshine Eldercare account.",
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary/50 paper-texture px-5 py-24 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-gold/40 bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">New Password</h1>
          <p className="mt-2 font-serif text-foreground/70">
            Create a secure new password for your account.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse bg-gold/10 rounded-xl" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}

