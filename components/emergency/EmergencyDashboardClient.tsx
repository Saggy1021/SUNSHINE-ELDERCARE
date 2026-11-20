"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Siren,
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
  createdAt?: string | Date;
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

  // Poll for real-time updates every 5 seconds (without UI polling indicator badge)
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/emergency/incidents", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.activeIncidents) {
            const sorted = [...data.activeIncidents].sort((a, b) => {
              const timeA = new Date(a.createdAt || a.triggeredAt).getTime();
              const timeB = new Date(b.createdAt || b.triggeredAt).getTime();
              return timeB - timeA;
            });
            setIncidents(sorted);
            if (data.metrics) {
              setMetrics(data.metrics);
            }
          }
        }
      } catch {
        // Retry next interval
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

  const filteredIncidents = incidents
    .filter((incident) => {
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
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.triggeredAt).getTime();
      const timeB = new Date(b.createdAt || b.triggeredAt).getTime();
      return timeB - timeA;
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#091329]">
              Incident Command Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Immediate triage, responder dispatch, telemetry tracking & safety confirmations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <EmergencyAudioAlert
            unacknowledgedCodeRedCount={unacknowledgedCodeReds.length}
            newIncidentIds={unacknowledgedCodeReds.map((i) => i.id)}
          />
          <Link
            href="/emergencyos/incidents/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-[#B08A4A]" />
            <span>Log Manual SOS / Call</span>
          </Link>
        </div>
      </div>

      {/* Critical SLA Alarm Banner if Unacknowledged Code Red exists */}
      {unacknowledgedCodeReds.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 text-red-950 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 rounded-lg text-white">
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-red-700">
                Critical Emergency SOS Triggered
              </div>
              <div className="text-sm sm:text-base font-bold text-red-950">
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
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all whitespace-nowrap"
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
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Active Incidents</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#091329]">
            {metrics.activeCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total in progress</div>
        </div>

        {/* Code Red */}
        <div
          className={`rounded-xl p-4 shadow-sm transition-colors border ${
            metrics.codeRedCount > 0
              ? "bg-red-50/70 border-red-300"
              : "bg-white border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                metrics.codeRedCount > 0
                  ? "text-red-700 font-bold"
                  : "text-slate-500 font-medium"
              }
            >
              Code Red
            </span>
            <Siren
              className={`w-4 h-4 ${
                metrics.codeRedCount > 0 ? "text-red-600 animate-pulse" : "text-slate-400"
              }`}
            />
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              metrics.codeRedCount > 0 ? "text-red-600" : "text-[#091329]"
            }`}
          >
            {metrics.codeRedCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Critical Priority</div>
        </div>

        {/* Pending Callbacks */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Pending Callbacks</span>
            <Phone className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">
            {metrics.pendingCallbacksCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">0 calls logged</div>
        </div>

        {/* Awaiting Safety */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Awaiting Safety</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">
            {metrics.awaitingSafetyCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Pending confirmation</div>
        </div>

        {/* Resolved Today */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Resolved Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {metrics.resolvedTodayCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Tracking ceased</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
        {/* Triage Classification Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterClassification("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              filterClassification === "ALL"
                ? "bg-[#091329] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Active ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterClassification("CODE_RED")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filterClassification === "CODE_RED"
                ? "bg-red-600 text-white shadow-sm"
                : "text-red-700 hover:bg-red-50"
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
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-700 hover:bg-amber-50"
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
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:bg-emerald-50"
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
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-[#091329] placeholder-slate-400 focus:outline-none focus:border-[#B08A4A] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Incidents Queue Feed */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
          <h3 className="text-base font-bold text-[#091329]">
            No Active Emergencies in this Queue
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
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
                className={`border rounded-xl p-4 sm:p-5 transition-all shadow-sm ${
                  isCodeRed
                    ? isUnacknowledged
                      ? "bg-red-50/50 border-red-400 ring-2 ring-red-400/20"
                      : "bg-white border-red-300"
                    : incident.classification === "CODE_YELLOW"
                    ? "bg-white border-amber-300"
                    : "bg-white border-slate-200/80"
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
                      <span className="font-mono text-sm font-bold text-[#091329]">
                        {incident.incidentNumber}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                          incident.status === "TRIGGERED"
                            ? "bg-red-100 text-red-700 border border-red-300 animate-pulse"
                            : incident.status === "ACKNOWLEDGED"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : incident.status === "DISPATCHED"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : incident.status === "RESPONDER_ON_SCENE"
                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {incident.status.replace(/_/g, " ")}
                      </span>

                      {/* SLA Elapsed Time */}
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Triggered {formatElapsed(incident.triggeredAt)}
                      </span>
                    </div>

                    {/* Member & Caller Line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                      <div className="flex items-center gap-1 font-semibold text-[#091329]">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{incident.callerName || "Unknown Member"}</span>
                        {incident.memberId && (
                          <span className="font-mono text-slate-500 font-normal">
                            ({incident.memberId})
                          </span>
                        )}
                      </div>

                      {incident.callerPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a
                            href={`tel:${incident.callerPhone}`}
                            className="font-mono text-[#B08A4A] font-bold hover:underline"
                          >
                            {incident.callerPhone}
                          </a>
                        </div>
                      )}

                      <div className="text-slate-500">
                        Source:{" "}
                        <span className="font-semibold text-slate-700">
                          {incident.triggerSource.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Location & Address Summary */}
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      {incident.currentLatitude && incident.currentLongitude ? (
                        <span className="font-mono text-slate-800">
                          Live GPS: {incident.currentLatitude.toFixed(5)},{" "}
                          {incident.currentLongitude.toFixed(5)} (±
                          {Math.round(incident.locationAccuracy || 10)}m)
                        </span>
                      ) : (
                        <span className="truncate max-w-xl text-slate-700">
                          {incident.fallbackAddress || "Registered address on file"}
                        </span>
                      )}
                    </div>

                    {/* Responder Status */}
                    {incident.assignedEmployee && (
                      <div className="text-xs text-blue-700 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        Assigned Responder: {incident.assignedEmployee.firstName}{" "}
                        {incident.assignedEmployee.lastName} (
                        {incident.assignedEmployee.employeeId})
                        {incident.assignedEmployee.contactNumber && (
                          <span className="font-mono text-blue-800">
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
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
                      >
                        {acknowledgingId === incident.id
                          ? "Acknowledging..."
                          : "Acknowledge"}
                      </button>
                    )}

                    <Link
                      href={`/emergencyos/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-colors"
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
