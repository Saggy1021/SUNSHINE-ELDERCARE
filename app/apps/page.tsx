import React from "react";
import { Metadata } from "next";
import { AppsService } from "@/lib/services/apps";
import { AppDownloadCard } from "@/components/apps/app-download-card";
import {
  Smartphone,
  ShieldCheck,
  DownloadCloud,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { Mandala, Lotus, Eyebrow } from "@/components/yoga/ornaments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Official Mobile Apps | Sunshine Eldercare",
  description:
    "Download official Android applications for Sunshine Eldercare members and staff. Dedicated elder-care assistance, one-tap emergency SOS, and live visit schedules.",
};

export default async function AppsDirectoryPage() {
  const apps = await AppsService.getPublishedApps();

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#FAF7F2] pt-28 pb-24 text-neutral-900">
      {/* Background Ornaments */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-96 w-96 opacity-10">
        <Mandala className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute top-1/2 -left-24 h-96 w-96 opacity-10">
        <Mandala className="h-full w-full" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Hero Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B08A4A]/30 bg-amber-50/80 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#B08A4A] shadow-sm backdrop-blur-sm">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Official Sunshine Mobile Suite</span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Sunshine Mobile Applications
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-600 sm:text-lg">
            Download the official Android applications for Sunshine Eldercare members,
            families, and care specialists. Engineered with offline resilience, one-tap emergency SOS,
            and real-time visit tracking.
          </p>
        </div>

        {/* Applications Catalog Grid */}
        <div className="mt-12">
          {apps.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
              <Smartphone className="mx-auto h-12 w-12 text-neutral-400" />
              <h3 className="mt-4 text-lg font-bold text-neutral-800">
                No Applications Published Yet
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Official releases are currently being prepared. Please check back shortly.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {apps.map((app) => (
                <AppDownloadCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </div>

        {/* Android Installation Instructions */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-[#B08A4A]/25 bg-white p-6 sm:p-10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-[#B08A4A]">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-neutral-900">
                How to Install on Your Android Device
              </h2>
              <p className="text-xs text-neutral-500">
                Simple 4-step guide to installing our official APK directly
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B08A4A] text-xs font-bold text-white">
                1
              </span>
              <h3 className="mt-3 text-sm font-bold text-neutral-800">Download APK</h3>
              <p className="mt-1 text-xs text-neutral-600">
                Tap the &quot;Download APK&quot; button above. Your browser will begin downloading the verified package.
              </p>
            </div>

            <div className="relative rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B08A4A] text-xs font-bold text-white">
                2
              </span>
              <h3 className="mt-3 text-sm font-bold text-neutral-800">Open Notification</h3>
              <p className="mt-1 text-xs text-neutral-600">
                Once downloaded, tap the notification in your status bar or open your device &apos;Downloads&apos; folder.
              </p>
            </div>

            <div className="relative rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B08A4A] text-xs font-bold text-white">
                3
              </span>
              <h3 className="mt-3 text-sm font-bold text-neutral-800">Allow Installation</h3>
              <p className="mt-1 text-xs text-neutral-600">
                If prompted by Android Security, tap &apos;Settings&apos; and switch on &quot;Allow from this source&quot;.
              </p>
            </div>

            <div className="relative rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B08A4A] text-xs font-bold text-white">
                4
              </span>
              <h3 className="mt-3 text-sm font-bold text-neutral-800">Install & Sign In</h3>
              <p className="mt-1 text-xs text-neutral-600">
                Tap &apos;Install&apos;. Launch the app and sign in with your registered phone number or credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Verification Banner */}
        <div className="mt-8 rounded-2xl border border-emerald-900/15 bg-emerald-50/70 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="h-7 w-7 flex-shrink-0 text-emerald-700 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Cryptographically Signed &amp; Verified Releases
                </h3>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed max-w-2xl">
                  All binaries published here are directly compiled and signed by Sunshine Eldercare
                  using official production release keystores. Checksums are verified continuously to ensure
                  zero tampering or malware.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <a
                href="/legal/privacy-policy"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 hover:underline"
              >
                <span>Security &amp; Privacy Policy</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
