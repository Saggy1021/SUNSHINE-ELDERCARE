import { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Siren,
  PhoneCall,
  ShieldAlert,
  Archive,
  ArrowRightLeft,
  LogOut,
  Radio,
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

  const [isSupervisor, hasAdminPortal] = await Promise.all([
    AuthorizationService.isEmergencySupervisor(
      session.user.id,
      session.user.email
    ),
    AuthorizationService.hasAdminPortalAccess(
      session.user.id,
      session.user.email
    ),
  ]);

  const userName =
    session.user.name || session.user.email || "Emergency Operator";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Operations Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link
              href="/emergencyos"
              className="flex items-center gap-3 hover:opacity-95 transition-opacity"
            >
              <div className="relative h-9 w-28 bg-white/90 rounded px-1.5 py-0.5 flex items-center justify-center">
                <Image
                  src="/images/logo.png"
                  alt="Sunshine Eldercare"
                  width={110}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base lg:text-lg bg-gradient-to-r from-red-500 via-amber-400 to-amber-200 bg-clip-text text-transparent uppercase">
                  EmergencyOS
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-red-950/80 text-red-400 border border-red-800/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Live Response
                </span>
              </div>
            </Link>
          </div>

          {/* Emergency Helpline Hotline Banner */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-200">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="font-semibold text-slate-300">24/7 HELPLINE:</span>
            <a
              href="tel:03340585515"
              className="font-mono font-bold text-red-400 hover:text-red-300 hover:underline"
            >
              033-4058-5515
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/emergencyos"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Siren className="w-4 h-4 text-red-400" />
              Incidents
            </Link>
            <Link
              href="/emergencyos/supervision"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Supervision
            </Link>
            <Link
              href="/emergencyos/history"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Archive className="w-4 h-4 text-slate-400" />
              Archive
            </Link>
          </nav>

          {/* Operator Profile, Switch Portal, & Logout */}
          <div className="flex items-center gap-3">
            {hasAdminPortal && (
              <Link
                href="/admin"
                className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Switch to Administrative Portal"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                Admin Portal
              </Link>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                {userName}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                {isSupervisor ? "Supervisor" : "Operator"}
              </div>
            </div>

            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
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
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
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
