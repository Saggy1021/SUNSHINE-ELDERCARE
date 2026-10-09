import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Shield, Users, RefreshCw, MessageSquare, ClipboardList, Package, Activity, LogOut, Receipt } from "lucide-react"
import { AuthorizationService } from "@/lib/services/authorization"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin")
  }
  
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: Activity },
    { name: "Members", href: "/admin/members", icon: Users },
    { name: "Renewals", href: "/admin/renewals", icon: RefreshCw },
    { name: "Payments", href: "/admin/payments", icon: Receipt },
    { name: "Inquiries", href: "/admin/inquiries", icon: ClipboardList },
    { name: "Feedback", href: "/admin/feedback", icon: MessageSquare },
    { name: "Add-ons", href: "/admin/add-ons", icon: Package },
    { name: "Care Operations", href: "/admin/care", icon: Activity },
    { name: "Audit Log", href: "/admin/audit-log", icon: Shield },
  ]

  const hasContentView = await AuthorizationService.can(session.user.id, 'CONTENT_VIEW');
  if (hasContentView) {
    navItems.push({ name: "Content (CMS)", href: "/admin/content", icon: ClipboardList });
  }

  const hasCommunicationView = await AuthorizationService.can(session.user.id, 'COMMUNICATION_VIEW');
  if (hasCommunicationView) {
    navItems.push({ name: "Communications", href: "/admin/communications", icon: MessageSquare });
  }

  const hasDocumentView = await AuthorizationService.can(session.user.id, 'DOCUMENT_VIEW');
  if (hasDocumentView) {
    navItems.push({ name: "Documents", href: "/admin/documents", icon: ClipboardList });
  }

  const hasAdminUserManage = await AuthorizationService.can(session.user.id, 'ADMIN_USER_MANAGE');
  if (hasAdminUserManage) {
    navItems.push({ name: "Admin Users", href: "/admin/admin-users", icon: Users });
  }

  const hasRoleManage = await AuthorizationService.can(session.user.id, 'ROLE_MANAGE');
  if (hasRoleManage) {
    navItems.push({ name: "Roles", href: "/admin/roles", icon: Shield });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row pt-24">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 text-white flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" /> Admin Portal
          </h2>
          <p className="text-slate-400 text-xs truncate">{session.user.email}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mb-6">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto h-[calc(100vh-6rem)]">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}
