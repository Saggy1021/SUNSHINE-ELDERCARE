"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  CheckCircle2,
  Copy,
  Smartphone,
  ShieldCheck,
  Calendar,
  HardDrive,
  FileText,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface PublishedAppCardProps {
  app: {
    id: string;
    slug: string;
    packageName: string;
    name: string;
    tagline?: string | null;
    description: string;
    iconUrl?: string | null;
    platform: string;
    category: string;
    latestRelease: {
      id: string;
      versionName: string;
      versionCode: number;
      apkUrl: string;
      apkFileName: string;
      fileSize: number;
      sha256: string;
      minAndroidVersion: string;
      targetSdkVersion?: number | null;
      releaseNotes?: string | null;
      isMandatory: boolean;
      releasedAt: Date | string;
    } | null;
  };
}

export function AppDownloadCard({ app }: PublishedAppCardProps) {
  const [copiedSha, setCopiedSha] = useState(false);
  const release = app.latestRelease;

  const handleCopySha = (sha: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(sha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2500);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  const downloadUrl = `/api/apps/${app.slug}/download`;

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#B08A4A]/25 bg-white/95 p-6 sm:p-8 shadow-xl shadow-amber-950/5 transition-all duration-300 hover:border-[#B08A4A]/60 hover:shadow-2xl">
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#B08A4A] via-[#D4AF37] to-[#8C6D37]" />

      <div>
        {/* Header: Icon, Titles & Platform Badges */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-[#B08A4A]/20 bg-gradient-to-br from-amber-50 to-orange-50 p-2 shadow-inner">
              {app.iconUrl ? (
                <img
                  src={app.iconUrl}
                  alt={`${app.name} icon`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#B08A4A]">
                  <Smartphone className="h-10 w-10" />
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-amber-900">
                  {app.platform === "ANDROID" ? "Android APK" : app.platform}
                </span>
                {release && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    v{release.versionName}
                  </span>
                )}
                {release?.isMandatory && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                    Required Update
                  </span>
                )}
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900">
                {app.name}
              </h2>
              {app.tagline && (
                <p className="text-sm font-medium text-[#B08A4A]">
                  {app.tagline}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Package identifier */}
        <div className="mt-3 text-xs font-mono text-neutral-500">
          ID: <span className="font-semibold text-neutral-700">{app.packageName}</span>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          {app.description}
        </p>

        {/* Release Metadata Pills */}
        {release && (
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-amber-950/10 bg-amber-50/50 p-3.5 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2 text-neutral-700">
              <Calendar className="h-4 w-4 text-[#B08A4A]" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-neutral-400">Released</span>
                <span className="font-semibold">{formatDate(release.releasedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <HardDrive className="h-4 w-4 text-[#B08A4A]" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-neutral-400">File Size</span>
                <span className="font-semibold">{formatFileSize(release.fileSize)}</span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-neutral-700">
              <Smartphone className="h-4 w-4 text-[#B08A4A]" />
              <div>
                <span className="block text-[10px] uppercase font-bold text-neutral-400">OS Support</span>
                <span className="font-semibold">{release.minAndroidVersion || "Android 10+"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Release Notes */}
        {release?.releaseNotes && (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
              <Sparkles className="h-3.5 w-3.5 text-[#B08A4A]" />
              <span>What&apos;s New in v{release.versionName}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 whitespace-pre-line">
              {release.releaseNotes}
            </p>
          </div>
        )}

        {/* Integrity Checksum */}
        {release?.sha256 && (
          <div className="mt-4 rounded-lg bg-neutral-100 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                SHA-256 Checksum
              </span>
              <button
                type="button"
                onClick={() => handleCopySha(release.sha256)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#B08A4A] hover:underline cursor-pointer"
              >
                {copiedSha ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="mt-1 font-mono text-[10px] text-neutral-700 truncate" title={release.sha256}>
              {release.sha256}
            </div>
          </div>
        )}
      </div>

      {/* Download Action Button */}
      <div className="mt-6 pt-4 border-t border-neutral-100">
        {release ? (
          <a
            href={downloadUrl}
            download={release.apkFileName}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#B08A4A] px-5 py-3.5 text-center text-sm font-bold text-white shadow-md shadow-amber-900/20 transition-all duration-200 hover:bg-[#977338] hover:shadow-lg active:scale-[0.99]"
          >
            <Download className="h-5 w-5" />
            <span>Download {app.name} APK</span>
            <span className="text-xs font-normal text-amber-100">({formatFileSize(release.fileSize)})</span>
          </a>
        ) : (
          <div className="rounded-xl bg-neutral-100 px-4 py-3 text-center text-xs font-medium text-neutral-500">
            No published release available at this time
          </div>
        )}
      </div>
    </div>
  );
}
