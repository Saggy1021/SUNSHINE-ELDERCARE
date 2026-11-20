import { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Siren,
  ShieldAlert,
  Archive,
  LogOut,
} from "lucide-react";
import { AuthorizationService } from "@/lib/services/authorization";

export default async function EmergencyOSLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/emergencyos");
  }

  const hasAccess = await AuthorizationService.hasEmergencyAccess(
    session.user.id,
    session.user.email
  );

  if (!hasAccess) {
    const isAdmin = await AuthorizationService.hasAdminPortalAccess(
      session.user.id,
      session.user.email
    );
    if (isAdmin) {
      redirect("/admin");
    }
    if (
      session.user.role === "EMPLOYEE" ||
      session.user.role === "STAFF" ||
      session.user.role === "CAREGIVER"
    ) {
      redirect("/employee");
    }
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091329] flex flex-col font-sans selection:bg-[#B08A4A] selection:text-white">
      {/* Top Operations Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-sm px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Portal Identity */}
          <div className="flex items-center gap-4">
            <Link
              href="/emergencyos"
              className="flex items-center gap-3 hover:opacity-95 transition-opacity"
            >
              <div className="relative h-10 w-32 flex items-center justify-start">
                <Image
                  src="/images/logo.png"
                  alt="Sunshine Eldercare"
                  width={128}
                  height={38}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wide text-base lg:text-lg text-[#091329]">
                  Emergency<span className="text-[#B08A4A]">OS</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Compact Subportal Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/emergencyos"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-[#091329] hover:bg-slate-100 transition-colors"
            >
              <Siren className="w-4 h-4 text-red-600" />
              <span>Incidents</span>
            </Link>
            <Link
              href="/emergencyos/supervision"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-[#091329] hover:bg-slate-100 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Supervision</span>
            </Link>
            <Link
              href="/emergencyos/history"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-[#091329] hover:bg-slate-100 transition-colors"
            >
              <Archive className="w-4 h-4 text-slate-500" />
              <span>Archive</span>
            </Link>
          </nav>

          {/* Recognizable Sign Out Control */}
          <div className="flex items-center gap-2">
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors"
                title="Sign Out of EmergencyOS"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Subportal Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Subportal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sunshine Eldercare EmergencyOS • Subportal Operational Command
          </span>
          <span className="font-mono text-slate-400">
            Encrypted Telemetry & Audit Stream Active
          </span>
        </div>
      </footer>
    </div>
  );
}
