import { Metadata } from "next"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export const metadata: Metadata = {
  title: "Dashboard | Sunshine Elder Care",
}

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user?.email) return null

  const dbUser = await db.user.findUnique({
    where: { email: session.user.email },
    include: { subscriptions: { include: { plan: true } } }
  })

  const activeSubscription = dbUser?.subscriptions.find(s => s.status === 'ACTIVE')

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-foreground/70">Welcome to your Sunshine Elder Care member portal.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-gold/30 bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Current Plan</h2>
          {activeSubscription ? (
            <div className="mt-4">
              <p className="text-2xl font-bold text-primary">{activeSubscription.plan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Status: Active</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-foreground/70">You don't have an active membership plan yet.</p>
              <a href="/membership" className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                View Plans
              </a>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gold/30 bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Need Assistance?</h2>
          <p className="mt-4 text-foreground/70">Our dedicated support team is available 24/7 for emergency response and medical coordination.</p>
          <a href="/contact-us" className="mt-4 inline-block rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}