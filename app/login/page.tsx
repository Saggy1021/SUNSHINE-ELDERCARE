import { Metadata } from "next"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Login | Sunshine Elder Care",
  description: "Login to your Sunshine Elder Care member dashboard.",
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary/50 paper-texture px-5 py-24 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-gold/40 bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 font-serif text-foreground/70">
            Sign in to access your dashboard.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}