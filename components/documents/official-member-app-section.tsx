"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  Info,
} from "lucide-react";

interface OfficialMemberAppSectionProps {
  app?: {
    versionName: string;
    versionCode: number;
    fileSize: number;
    sha256: string;
    apkUrl: string;
    apkFileName: string;
    releasedAt?: string | Date;
  };
}

export function OfficialMemberAppSection({ app }: OfficialMemberAppSectionProps) {
  const [copiedSha, setCopiedSha] = useState(false);

  const versionName = app?.versionName || "1.0.5";
  const versionCode = app?.versionCode || 6;
  const fileSizeMb = app?.fileSize ? (app.fileSize / (1024 * 1024)).toFixed(1) : "46.7";
  const sha256 =
    app?.sha256 || "cf672287e6e396dcfa6070a6256176ba5d1161342187b1f4f406ef3b0368deaf";
  const downloadUrl = app?.apkUrl || "/downloads/apps/Sunshine-Member-Release.apk";
  const apkFileName = app?.apkFileName || "Sunshine-Member-Release.apk";

  const handleCopySha = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2500);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#B08A4A]/30 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 p-6 sm:p-8 shadow-lg shadow-amber-950/5">
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#B08A4A] via-[#D4AF37] to-[#8C6D37]" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Branding & Overview */}
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#B08A4A] to-[#8C6D37] text-white shadow-md shadow-amber-900/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                  Official Android Package
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  v{versionName} (Build {versionCode})
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                  Android 10+
                </span>
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-[#091329] dark:text-white">
                Official Sunshine Member App
              </h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            Official installation and update package (.apk) for Sunshine Eldercare members and families.
            Provides 1-tap Emergency SOS dispatch, live ambulance GPS coordination, dedicated Care Manager access, and medical record management.
          </p>

          {/* Highlights & Security Invariants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Cryptographically Signed:</strong> Verified release keystore certificate.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <Sparkles className="h-4 w-4 text-[#B08A4A] shrink-0 mt-0.5" />
              <span>
                <strong>Background Auto-Update:</strong> Seamless in-app update delivery.
              </span>
            </div>
          </div>

          {/* SHA-256 Checksum Display */}
          <div className="rounded-xl border border-border/60 bg-white/80 dark:bg-card p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                SHA-256 Integrity Fingerprint
              </span>
              <button
                type="button"
                onClick={handleCopySha}
                className="flex items-center gap-1 text-xs font-semibold text-[#B08A4A] hover:underline cursor-pointer"
                title="Copy SHA-256 hash"
              >
                {copiedSha ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>
            <div
              className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200 break-all select-all bg-neutral-100 dark:bg-neutral-900/60 p-2 rounded-lg"
              title={sha256}
            >
              {sha256}
            </div>
          </div>
        </div>

        {/* Right: Download Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px] shrink-0 lg:pt-2">
          <a
            href={downloadUrl}
            download={apkFileName}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-[#B08A4A] px-6 py-4 text-center text-sm font-bold text-white shadow-md shadow-amber-900/20 transition-all duration-200 hover:bg-[#977338] hover:shadow-lg active:scale-[0.99]"
          >
            <Download className="h-5 w-5" />
            <div className="text-left">
              <div className="text-sm font-bold leading-tight">Download Member APK</div>
              <div className="text-[11px] font-normal text-amber-100">
                v{versionName} • {fileSizeMb} MB
              </div>
            </div>
          </a>

          <a
            href="/apps"
            className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-white dark:bg-card px-4 py-3 text-center text-xs font-semibold text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-2xs"
          >
            <span>View All Sunshine Apps</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
            <Info className="h-3.5 w-3.5" />
            <span>Package ID: in.sunshineeldercare.member</span>
          </div>
        </div>
      </div>
    </div>
  );
}
