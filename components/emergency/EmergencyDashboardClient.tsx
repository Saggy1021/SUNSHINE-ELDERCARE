"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Siren,
  AlertTriangle,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  MapPin,
  User,
  Radio,
  Flame,
  Activity,
  Filter,
} from "lucide-react";
import { EmergencyAudioAlert } from "./EmergencyAudioAlert";
import {
  acknowledgeEmergencyIncidentAction,
} from "@/app/actions/emergency";

interface IncidentSummary {
  id: string;
  incidentNumber: string;
  status: string;
  classification: string;
  memberId: string | null;
  callerName: string | null;
  callerPhone: string | null;
  triggerSource: string;
  triggerNotes: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  locationAccuracy: number | null;
  fallbackAddress: string | null;
  triggeredAt: string | Date;
  acknowledgedAt: string | Date | null;
  safetyConfirmedAt: string | Date | null;
  assignedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    contactNumber: string | null;
    employeeId: string;
  } | null;
  _count: {
    logs: number;
  };
}

interface DashboardMetrics {
  activeCount: number;
  codeRedCount: number;
  pendingCallbacksCount: number;
  awaitingSafetyCount: number;
  resolvedTodayCount: number;
}

interface EmergencyDashboardClientProps {
  initialIncidents: IncidentSummary[];
  initialMetrics: DashboardMetrics;
  isSupervisor: boolean;
}

export function EmergencyDashboardClient({
  initialIncidents,
  initialMetrics,
  isSupervisor,
}: EmergencyDashboardClientProps) {
  const [incidents, setIncidents] = useState<IncidentSummary[]>(initialIncidents);
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [filterClassification, setFilterClassification] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // Poll for real-time updates every 5 seconds
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/emergency/incidents", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.activeIncidents) {
            setIncidents(data.activeIncidents);
            if (data.metrics) {
              setMetrics(data.metrics);
            }
          }
        }
      } catch {
        // Polling retry on next tick
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const unacknowledgedCodeReds = incidents.filter(
    (i) => i.classification === "CODE_RED" && i.status === "TRIGGERED"
  );

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    startTransition(async () => {
      try {
        await acknowledgeEmergencyIncidentAction(id);
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: "ACKNOWLEDGED",
                  acknowledgedAt: new Date(),
                }
              : i
          )
        );
      } catch (err: any) {
        alert(err.message || "Failed to acknowledge incident");
      } finally {
        setAcknowledgingId(null);
      }
    });
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (filterClassification !== "ALL" && incident.classification !== filterClassification) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchNumber = incident.incidentNumber.toLowerCase().includes(q);
      const matchName = incident.callerName?.toLowerCase().includes(q) ?? false;
      const matchMemberId = incident.memberId?.toLowerCase().includes(q) ?? false;
      const matchPhone = incident.callerPhone?.includes(q) ?? false;
      return matchNumber || matchName || matchMemberId || matchPhone;
    }
    return true;
  });

  const formatElapsed = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ${diffMin % 60}m ago`;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Incident Bar & Audio Alert */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800/60 text-red-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Incident Command Dashboard
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                LIVE 5s POLLING
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Immediate triage, dispatch, telemetry tracking & safety confirmations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <EmergencyAudioAlert
            unacknowledgedCodeRedCount={unacknowledgedCodeReds.length}
          />
          <Link
            href="/emergencyos/incidents/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Log Manual SOS / Call
          </Link>
        </div>
      </div>

      {/* Critical SLA Alarm Banner if Unacknowledged Code Red exists */}
      {unacknowledgedCodeReds.length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-600 rounded-xl p-4 text-white shadow-xl animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-lg text-white">
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide uppercase text-red-200">
                Critical Emergency SOS Triggered
              </div>
              <div className="text-base font-bold text-white">
                {unacknowledgedCodeReds.length} Unacknowledged CODE RED alert(s) requiring immediate action!
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {unacknowledgedCodeReds.map((inc) => (
              <button
                key={inc.id}
                type="button"
                disabled={acknowledgingId === inc.id}
                onClick={() => handleAcknowledge(inc.id)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-white text-red-700 hover:bg-red-100 shadow transition-all whitespace-nowrap"
              >
                {acknowledgingId === inc.id
                  ? "Acknowledging..."
                  : `Acknowledge ${inc.incidentNumber}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Emergencies */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Incidents</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100">
            {metrics.activeCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total in progress</div>
        </div>

        {/* Code Red */}
        <div
          className={`border rounded-xl p-4 shadow transition-colors ${
            metrics.codeRedCount > 0
              ? "bg-red-950/40 border-red-800/80"
              : "bg-slate-900 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                metrics.codeRedCount > 0
                  ? "text-red-300 font-bold"
                  : "text-slate-400"
              }
            >
              Code Red
            </span>
            <Siren
              className={`w-4 h-4 ${
                metrics.codeRedCount > 0 ? "text-red-400 animate-pulse" : "text-slate-500"
              }`}
            />
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              metrics.codeRedCount > 0 ? "text-red-400" : "text-slate-200"
            }`}
          >
            {metrics.codeRedCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Critical Priority</div>
        </div>

        {/* Pending Callbacks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Callbacks</span>
            <Phone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">
            {metrics.pendingCallbacksCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">0 calls logged</div>
        </div>

        {/* Awaiting Safety */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Awaiting Safety</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-400">
            {metrics.awaitingSafetyCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Pending confirmation</div>
        </div>

        {/* Resolved Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Resolved Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {metrics.resolvedTodayCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Tracking ceased</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        {/* Triage Classification Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterClassification("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterClassification === "ALL"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            All Active ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterClassification("CODE_RED")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filterClassification === "CODE_RED"
                ? "bg-red-700 text-white"
                : "text-red-400 hover:text-red-300 hover:bg-red-950/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Code Red ({incidents.filter((i) => i.classification === "CODE_RED").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterClassification("CODE_YELLOW")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filterClassification === "CODE_YELLOW"
                ? "bg-amber-700 text-white"
                : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Code Yellow ({incidents.filter((i) => i.classification === "CODE_YELLOW").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterClassification("CODE_GREEN")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filterClassification === "CODE_GREEN"
                ? "bg-emerald-700 text-white"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Code Green ({incidents.filter((i) => i.classification === "CODE_GREEN").length})
          </button>
        </div>

        {/* Quick Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search number, member, phone..."
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Incidents Queue Feed */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-slate-200">
            No Active Emergencies in this Queue
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            All current incidents have been resolved. The system continues monitoring incoming SOS streams 24/7.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const isCodeRed = incident.classification === "CODE_RED";
            const isUnacknowledged = incident.status === "TRIGGERED";

            return (
              <div
                key={incident.id}
                className={`border rounded-xl p-4 sm:p-5 transition-all shadow-md ${
                  isCodeRed
                    ? isUnacknowledged
                      ? "bg-red-950/40 border-red-600 ring-2 ring-red-500/30"
                      : "bg-slate-900/90 border-red-900/60"
                    : incident.classification === "CODE_YELLOW"
                    ? "bg-slate-900 border-amber-900/50"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Incident info & Member summary */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Classification Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md ${
                          isCodeRed
                            ? "bg-red-600 text-white"
                            : incident.classification === "CODE_YELLOW"
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {isCodeRed && <Flame className="w-3.5 h-3.5" />}
                        {incident.classification.replace("_", " ")}
                      </span>

                      {/* Incident Number */}
                      <span className="font-mono text-sm font-bold text-slate-200">
                        {incident.incidentNumber}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                          incident.status === "TRIGGERED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                            : incident.status === "ACKNOWLEDGED"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : incident.status === "DISPATCHED"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : incident.status === "RESPONDER_ON_SCENE"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {incident.status.replace(/_/g, " ")}
                      </span>

                      {/* SLA Elapsed Time */}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Triggered {formatElapsed(incident.triggeredAt)}
                      </span>
                    </div>

                    {/* Member & Caller Line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1 font-semibold text-white">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{incident.callerName || "Unknown Member"}</span>
                        {incident.memberId && (
                          <span className="font-mono text-slate-400">
                            ({incident.memberId})
                          </span>
                        )}
                      </div>

                      {incident.callerPhone && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a
                            href={`tel:${incident.callerPhone}`}
                            className="font-mono text-amber-400 hover:underline"
                          >
                            {incident.callerPhone}
                          </a>
                        </div>
                      )}

                      <div className="text-slate-400">
                        Source:{" "}
                        <span className="font-semibold text-slate-300">
                          {incident.triggerSource.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Location & Address Summary */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      {incident.currentLatitude && incident.currentLongitude ? (
                        <span className="font-mono text-slate-300">
                          Live GPS: {incident.currentLatitude.toFixed(5)},{" "}
                          {incident.currentLongitude.toFixed(5)} (±
                          {Math.round(incident.locationAccuracy || 10)}m)
                        </span>
                      ) : (
                        <span className="truncate max-w-xl text-slate-300">
                          {incident.fallbackAddress || "Registered address on file"}
                        </span>
                      )}
                    </div>

                    {/* Responder Status */}
                    {incident.assignedEmployee && (
                      <div className="text-xs text-blue-300 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        Assigned Responder: {incident.assignedEmployee.firstName}{" "}
                        {incident.assignedEmployee.lastName} (
                        {incident.assignedEmployee.employeeId})
                        {incident.assignedEmployee.contactNumber && (
                          <span className="font-mono text-blue-200">
                            • {incident.assignedEmployee.contactNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Operational Action Buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {isUnacknowledged && (
                      <button
                        type="button"
                        disabled={acknowledgingId === incident.id}
                        onClick={() => handleAcknowledge(incident.id)}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow transition-colors"
                      >
                        {acknowledgingId === incident.id
                          ? "Acknowledging..."
                          : "Acknowledge"}
                      </button>
                    )}

                    <Link
                      href={`/emergencyos/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow transition-colors"
                    >
                      <span>Command Console</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
