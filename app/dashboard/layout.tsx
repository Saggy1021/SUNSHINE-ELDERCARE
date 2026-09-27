import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, UserSquare2, ShieldAlert, MessageSquarePlus, RefreshCw, LogOut } from "lucide-react"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard")
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Membership", href: "/dashboard/membership", icon: UserSquare2 },
    { name: "My Profile", href: "/dashboard/profile", icon: UserSquare2 },
    { name: "Membership History", href: "/dashboard/history", icon: RefreshCw },
    { name: "Financial Documents", href: "/dashboard/documents", icon: RefreshCw },
    { name: "Manage Membership", href: "/dashboard/manage-membership", icon: RefreshCw },
    { name: "Emergency Contact", href: "/dashboard/emergency-contact", icon: ShieldAlert },
    { name: "Care Tracking", href: "/dashboard/care", icon: ShieldAlert },
    { name: "Feedback", href: "/dashboard/feedback", icon: MessageSquarePlus },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">Member Portal</h2>
          <p className="text-slate-400 text-sm truncate">{session.user.name || session.user.email}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mb-6">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
