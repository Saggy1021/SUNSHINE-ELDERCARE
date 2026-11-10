import { Metadata } from "next"
import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | Sunshine Eldercare",
  description: "Reset your Sunshine Eldercare account password.",
}

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary/50 paper-texture px-5 py-24 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-gold/40 bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 font-serif text-foreground/70">
            Enter your registered email to receive a password reset link.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}

