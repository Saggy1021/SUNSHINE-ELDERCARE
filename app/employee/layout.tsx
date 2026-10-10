import { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, CalendarDays, LogOut } from "lucide-react";

import { AuthorizationService } from "@/lib/services/authorization";

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
    { name: "My Schedule", href: "/employee", icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pt-16">
      <aside className="w-full md:w-64 bg-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">Staff Portal</h2>
          <p className="text-slate-400 text-sm truncate">{session.user.name || session.user.email}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mb-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
