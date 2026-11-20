"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Siren,
  Flame,
  Radio,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Phone,
  MapPin,
  RefreshCw,
  Activity,
  ChevronRight,
} from "lucide-react";
import { EmergencyAudioAlert } from "./EmergencyAudioAlert";

interface IncidentItem {
  id: string;
  incidentNumber: string;
  status: string;
  classification: "CODE_RED" | "CODE_YELLOW" | "CODE_GREEN" | string;
  memberId: string | null;
  callerName: string | null;
  callerPhone: string | null;
  triggerSource: string;
  triggerNotes: string | null;
  fallbackAddress: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  triggeredAt: string | Date;
  acknowledgedAt: string | Date | null;
  safetyConfirmedAt: string | Date | null;
  assignedEmployee?: {
    firstName: string;
    lastName: string;
    contactNumber: string | null;
  } | null;
}

interface MonitoringMetrics {
  activeCount: number;
  codeRedCount: number;
  codeYellowCount: number;
  codeGreenCount: number;
  resolvedTodayCount: number;
  totalResolvedCount: number;
}

interface AdminEmergencyMonitoringProps {
  initialIncidents: IncidentItem[];
  initialMetrics: MonitoringMetrics;
}

export function AdminEmergencyMonitoringDashboard({
  initialIncidents,
  initialMetrics,
}: AdminEmergencyMonitoringProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);
  const [metrics, setMetrics] = useState<MonitoringMetrics>(initialMetrics);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Poll for live emergency updates every 5 seconds
  const fetchLiveEmergencyFeed = async () => {
    try {
      const res = await fetch("/api/emergency/incidents", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.activeIncidents) {
          setIncidents(data.activeIncidents);

          const active = data.activeIncidents as IncidentItem[];
          const red = active.filter((i) => i.classification === "CODE_RED").length;
          const yellow = active.filter((i) => i.classification === "CODE_YELLOW").length;
          const green = active.filter((i) => i.classification === "CODE_GREEN").length;

          setMetrics({
            activeCount: active.length,
            codeRedCount: red,
            codeYellowCount: yellow,
            codeGreenCount: green,
            resolvedTodayCount: data.metrics?.resolvedTodayCount ?? metrics.resolvedTodayCount,
            totalResolvedCount: metrics.totalResolvedCount,
          });
          setLastRefreshed(new Date());
        }
      }
    } catch (e) {
      // Quiet retry on next cycle
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchLiveEmergencyFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveEmergencyFeed();
    setIsRefreshing(false);
  };

  const unacknowledgedIncidents = incidents.filter(
    (i) =>
      (i.classification === "CODE_RED" || i.classification === "CODE_YELLOW") &&
      i.status === "TRIGGERED" &&
      !i.acknowledgedAt
  );
  const activeCodeReds = incidents.filter(
    (i) => i.classification === "CODE_RED" && i.status !== "RESOLVED"
  );
  const unacknowledgedCodeReds = activeCodeReds.filter((i) => !i.acknowledgedAt);

  const formatElapsed = (triggeredAt: string | Date) => {
    const d = new Date(triggeredAt);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return `${Math.max(0, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ${diffMin % 60}m ago`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-red-600 dark:text-red-400 font-bold">EmergencyOS Monitoring</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <Siren className="w-6 h-6 text-red-600 animate-pulse" />
            EmergencyOS Command Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time emergency incident monitoring, triage statistics, and direct operator escalation.
          </p>
        </div>

        {/* Audio Controls & Standalone Console Shortcut */}
        <div className="flex flex-wrap items-center gap-3">
          <EmergencyAudioAlert
            unacknowledgedIncidents={unacknowledgedIncidents}
            unacknowledgedCodeRedCount={unacknowledgedCodeReds.length}
            newIncidentIds={unacknowledgedIncidents.map((i) => i.id)}
          />

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#B08A4A]" : ""}`} />
          </button>

          <Link
            href="/emergencyos"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-all"
          >
            <span>Launch Operator Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#B08A4A]" />
          </Link>
        </div>
      </div>

      {/* Prominent Code Red Warning Panel (Visible when any Code Red is active) */}
      {activeCodeReds.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl p-5 text-red-950 dark:text-red-200 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600 rounded-xl text-white shadow-md animate-pulse shrink-0">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                  CRITICAL EMERGENCY ACTIVE
                </span>
                <span className="text-xs text-red-700 dark:text-red-300 font-bold">
                  {activeCodeReds.length} Code Red incident(s) require immediate dispatch
                </span>
              </div>
              <h3 className="text-base font-bold text-red-950 dark:text-white mt-1">
                Life-Safety Priority Escalation in Effect
              </h3>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5 leading-relaxed">
                Emergency dispatchers must acknowledge incoming alerts within 60 seconds and maintain
                live telemetry with the field responder.
              </p>
            </div>
          </div>

          <Link
            href="/emergencyos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all shrink-0"
          >
            <span>Open Operator Console</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* LIVE COUNTERS SECTION */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Code Red */}
        <div
          className={`bg-card rounded-2xl p-4 border transition-all shadow-sm ${
            metrics.codeRedCount > 0
              ? "border-red-400 bg-red-50/40 ring-2 ring-red-500/20"
              : "border-border/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
              Code Red
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">
            {metrics.codeRedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Life-Threatening / SOS</p>
        </div>

        {/* Active Code Yellow */}
        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Code Yellow
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {metrics.codeYellowCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Urgent Care Escalations</p>
        </div>

        {/* Active Code Green */}
        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Code Green
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.codeGreenCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Non-Emergency Assistance</p>
        </div>

        {/* Total Active Emergencies */}
        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#091329] dark:text-white uppercase tracking-wider">
              Total Active
            </span>
            <Radio className="w-3.5 h-3.5 text-[#B08A4A]" />
          </div>
          <div className="text-3xl font-black text-[#091329] dark:text-white mt-2">
            {metrics.activeCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Open Triage Cases</p>
        </div>

        {/* Resolved Today */}
        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Resolved Today
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-700 dark:text-slate-200 mt-2">
            {metrics.resolvedTodayCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Confirmed Safe Today</p>
        </div>
      </div>

      {/* LATEST INCOMING SOS INCIDENTS SECTION */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-[#091329] dark:text-white">
                Incoming Emergency Queue & Active Incidents
              </h3>
              <p className="text-xs text-muted-foreground">
                Displaying real-time emergency transmissions. Auto-refreshing every 5 seconds.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Last update: {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-16 p-8">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto opacity-50 mb-3" />
            <h4 className="text-base font-bold text-[#091329] dark:text-white">
              No Active Emergencies
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              All members are safe and no distress calls or mobile SOS signals are pending triage.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {incidents.map((inc) => {
              const isRed = inc.classification === "CODE_RED";
              const isYellow = inc.classification === "CODE_YELLOW";
              const isGreen = inc.classification === "CODE_GREEN";

              return (
                <div
                  key={inc.id}
                  className={`p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isRed
                      ? "bg-red-50/20 hover:bg-red-50/40"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {/* Left Column: Details */}
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Classification Badge */}
                      <span
                        className={`px-2.5 py-0.5 text-xs font-black rounded-md uppercase tracking-wider ${
                          isRed
                            ? "bg-red-600 text-white shadow-sm"
                            : isYellow
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {inc.classification.replace("_", " ")}
                      </span>

                      {/* Incident # */}
                      <span className="font-mono text-xs font-bold text-[#091329] dark:text-white">
                        {inc.incidentNumber}
                      </span>

                      {/* Status */}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {inc.status}
                      </span>

                      {/* Elapsed Time */}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#B08A4A]" />
                        <span>Received {formatElapsed(inc.triggeredAt)}</span>
                      </span>
                    </div>

                    {/* Member Name & Contact */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-bold text-[#091329] dark:text-white">
                        {inc.callerName || "Unknown Member"}
                      </span>
                      {inc.memberId && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          ID: {inc.memberId}
                        </span>
                      )}
                      {inc.callerPhone && (
                        <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                          <Phone className="w-3 h-3 text-[#B08A4A]" />
                          <span>{inc.callerPhone}</span>
                        </span>
                      )}
                    </div>

                    {/* Location & Trigger Source */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-slate-700">
                        Source: {inc.triggerSource}
                      </span>
                      {inc.fallbackAddress && (
                        <span className="flex items-center gap-1 truncate max-w-md">
                          <MapPin className="w-3 h-3 text-[#B08A4A] shrink-0" />
                          <span className="truncate">{inc.fallbackAddress}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: CTA */}
                  <div className="shrink-0 flex items-center gap-3">
                    <Link
                      href={`/emergencyos/incidents/${inc.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-all"
                    >
                      <span>Open in Operator Console</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#B08A4A]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
