import { Metadata } from "next"
import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Sign Up | Sunshine Elder Care",
  description: "Create an account to manage your Sunshine Elder Care services.",
}

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary/50 paper-texture px-5 py-24 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-gold/40 bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Join the Family</h1>
          <p className="mt-2 font-serif text-foreground/70">
            Create an account to access our care portal.
          </p>
        </div>
        <SignupForm />
      </div>
    </main>
  )
}