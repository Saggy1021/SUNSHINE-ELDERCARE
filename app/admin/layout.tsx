import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Shield, Users, RefreshCw, MessageSquare, ClipboardList, Package, Activity, Receipt } from "lucide-react"
import { AuthorizationService } from "@/lib/services/authorization"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { WorkspaceNavLink } from "@/components/workspace/workspace-nav-link"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin")
  }
  
  const isOwner = session.user.email === 'info.sunshineeldercare@gmail.com';
  const [
    hasAdminAccess,
    hasContentView,
    hasCommunicationView,
    hasDocumentView,
    hasAdminUserManage,
    hasRoleManage,
  ] = isOwner
    ? [true, true, true, true, true, true]
    : await Promise.all([
        AuthorizationService.hasAdminPortalAccess(session.user.id),
        AuthorizationService.can(session.user.id, 'CONTENT_VIEW'),
        AuthorizationService.can(session.user.id, 'COMMUNICATION_VIEW'),
        AuthorizationService.can(session.user.id, 'DOCUMENT_VIEW'),
        AuthorizationService.can(session.user.id, 'ADMIN_USER_MANAGE'),
        AuthorizationService.can(session.user.id, 'ROLE_MANAGE'),
      ]);

  if (!hasAdminAccess) {
    // If they don't have admin access, check if they are an employee (for the operational portal)
    if (
      session.user.role === 'EMPLOYEE' ||
      session.user.role === 'STAFF' || 
      session.user.role === 'CAREGIVER'
    ) {
      redirect("/employee");
    }
    // Otherwise, standard member
    redirect("/dashboard");
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: <Activity className="h-4 w-4" /> },
    { name: "Members", href: "/admin/members", icon: <Users className="h-4 w-4" /> },
    { name: "Renewals", href: "/admin/renewals", icon: <RefreshCw className="h-4 w-4" /> },
    { name: "Payments", href: "/admin/payments", icon: <Receipt className="h-4 w-4" /> },
    { name: "Inquiries", href: "/admin/inquiries", icon: <ClipboardList className="h-4 w-4" /> },
    { name: "Feedback", href: "/admin/feedback", icon: <MessageSquare className="h-4 w-4" /> },
    { name: "Add-ons", href: "/admin/add-ons", icon: <Package className="h-4 w-4" /> },
    { name: "Care Operations", href: "/admin/care", icon: <Activity className="h-4 w-4" /> },
    { name: "Audit Log", href: "/admin/audit-log", icon: <Shield className="h-4 w-4" /> },
  ]

  if (hasContentView) {
    navItems.push({ name: "Content (CMS)", href: "/admin/content", icon: <ClipboardList className="h-4 w-4" /> });
  }

  if (hasCommunicationView) {
    navItems.push({ name: "Communications", href: "/admin/communications", icon: <MessageSquare className="h-4 w-4" /> });
  }

  if (hasDocumentView) {
    navItems.push({ name: "Documents", href: "/admin/documents", icon: <ClipboardList className="h-4 w-4" /> });
  }

  if (hasAdminUserManage) {
    navItems.push({ name: "Employees", href: "/admin/employees", icon: <Users className="h-4 w-4" /> });
  }

  if (hasRoleManage) {
    navItems.push({ name: "Roles", href: "/admin/roles", icon: <Shield className="h-4 w-4" /> });
  }

  return (
    <WorkspaceShell
      portalName="Admin Portal"
      userDisplay={session.user.email || 'Admin User'}
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
