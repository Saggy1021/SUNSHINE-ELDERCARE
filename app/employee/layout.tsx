import { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { AuthorizationService } from "@/lib/services/authorization";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceNavLink } from "@/components/workspace/workspace-nav-link";

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/employee");
  }

  const isOwner = session.user.email === 'info.sunshineeldercare@gmail.com';
  
  if (isOwner) {
    redirect('/admin');
  }

  const hasAdminAccess = await AuthorizationService.hasAdminPortalAccess(session.user.id);
  if (hasAdminAccess) {
    redirect('/admin');
  }

  // Ensure they are actually an employee
  if (
    session.user.role !== 'EMPLOYEE' &&
    session.user.role !== 'STAFF' &&
    session.user.role !== 'CAREGIVER'
  ) {
    redirect("/dashboard");
  }

  const navItems = [
    { name: "My Schedule", href: "/employee", icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <WorkspaceShell
      portalName="Staff Portal"
      userDisplay={session.user.name || session.user.email || 'Staff Member'}
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
  );
}
