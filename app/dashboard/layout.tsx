import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { LogoutButton } from "@/components/yoga/logout-button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-secondary/30 pt-20">
      {/* Simple sidebar for dashboard */}
      <aside className="w-64 border-r border-gold/20 bg-card p-6 hidden md:block">
        <div className="mb-8">
          <p className="font-serif text-sm uppercase tracking-wider text-muted-foreground">
            Member Portal
          </p>
          <p className="mt-1 font-display text-xl font-bold">{session.user.name}</p>
        </div>
        <nav className="space-y-2">
          <a href="/dashboard" className="block rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Overview
          </a>
          <a href="/dashboard/membership" className="block rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">
            My Membership
          </a>
          <a href="/dashboard/settings" className="block rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">
            Settings
          </a>
          <div className="pt-4 mt-4 border-t border-gold/10">
            <LogoutButton />
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-6 sm:p-10">
        {children}
      </main>
    </div>
  )
}
