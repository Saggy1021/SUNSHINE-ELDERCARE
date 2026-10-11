import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LayoutDashboard, ShieldCheck, User, History, FileText, Settings, PhoneCall, Activity, MessageSquarePlus } from "lucide-react"

import { AuthorizationService } from "@/lib/services/authorization"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { WorkspaceNavLink } from "@/components/workspace/workspace-nav-link"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard")
  }

  const isOwner = session.user.email === 'info.sunshineeldercare@gmail.com';
  
  if (isOwner) {
    redirect('/admin');
  }

  // Canonical classification handling
  if (
    session.user.role === 'EMPLOYEE' ||
    // Legacy backwards compatibility strings
    session.user.role === 'ADMIN' || 
    session.user.role === 'SUPER_ADMIN' || 
    session.user.role === 'COORDINATOR' ||
    session.user.role === 'STAFF' || 
    session.user.role === 'CAREGIVER'
  ) {
    const hasAdminAccess = await AuthorizationService.hasAdminPortalAccess(session.user.id);
    if (hasAdminAccess) {
      redirect('/admin');
    } else {
      redirect('/employee');
    }
  }

  // MEMBER and USER stay on /dashboard

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { name: "My Membership", href: "/dashboard/membership", icon: <ShieldCheck className="h-4 w-4" /> },
    { name: "My Profile", href: "/dashboard/profile", icon: <User className="h-4 w-4" /> },
    { name: "Membership History", href: "/dashboard/history", icon: <History className="h-4 w-4" /> },
    { name: "Financial Documents", href: "/dashboard/documents", icon: <FileText className="h-4 w-4" /> },
    { name: "Manage Membership", href: "/dashboard/manage-membership", icon: <Settings className="h-4 w-4" /> },
    { name: "Emergency Contact", href: "/dashboard/emergency-contact", icon: <PhoneCall className="h-4 w-4" /> },
    { name: "Care Tracking", href: "/dashboard/care", icon: <Activity className="h-4 w-4" /> },
    { name: "Feedback", href: "/dashboard/feedback", icon: <MessageSquarePlus className="h-4 w-4" /> },
  ]

  return (
    <WorkspaceShell
      portalName="Member Portal"
      userDisplay={session.user.name || session.user.email || 'Member'}
      sidebarNav={
        <>
          {navItems.map((item) => (
            <WorkspaceNavLink key={item.href} href={item.href} icon={item.icon}>
              {item.name}
            </WorkspaceNavLink>
          ))}
        </>
      }
    >
      <div className="space-y-8 pb-12">
        {children}
      </div>
    </WorkspaceShell>
  )
}
