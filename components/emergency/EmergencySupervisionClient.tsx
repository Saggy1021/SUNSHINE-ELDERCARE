"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Flame,
  Clock,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  FileText,
  AlertCircle,
} from "lucide-react";

interface DowngradedIncident {
  id: string;
  incidentNumber: string;
  classification: string;
  previousClassification: string | null;
  callerName: string | null;
  memberId: string | null;
  downgradeReason: string | null;
  downgradeApprovedAt: string | Date | null;
  downgradedBy: {
    name: string | null;
    email: string | null;
  } | null;
}

interface SlaBreachIncident {
  id: string;
  incidentNumber: string;
  classification: string;
  status: string;
  callerName: string | null;
  triggeredAt: string | Date;
  breachType: "UNACKNOWLEDGED_CODE_RED" | "DELAYED_DISPATCH" | "DELAYED_ARRIVAL";
  elapsedMinutes: number;
}

interface EmergencySupervisionClientProps {
  downgrades: DowngradedIncident[];
  slaBreaches: SlaBreachIncident[];
  isSupervisor: boolean;
}

export function EmergencySupervisionClient({
  downgrades,
  slaBreaches,
  isSupervisor,
}: EmergencySupervisionClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Supervisor Escalation & SLA Queue
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800">
                Supervisor Authority
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Audit trail of Code Red classification changes, triage overrides & SLA alerts
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-400">Supervisory Status: </span>
          <span
            className={`font-bold ${
              isSupervisor ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {isSupervisor ? "Authorized Supervisor" : "Operator (Read Only)"}
          </span>
        </div>
      </div>

      {/* SLA Breach Watchlist */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Active SLA Breach Alerts ({slaBreaches.length})
        </h2>

        {slaBreaches.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              All active incidents are progressing within targeted SLA response windows (ACK &lt; 120s, Dispatch &lt; 5m).
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slaBreaches.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-xs text-white space-y-2 shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-400">
                      {item.incidentNumber}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-black rounded bg-red-600 text-white uppercase">
                      {item.classification.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-red-300">
                    +{item.elapsedMinutes}m elapsed
                  </span>
                </div>

                <div className="text-slate-300">
                  Member:{" "}
                  <strong className="text-white">
                    {item.callerName || "Unknown Member"}
                  </strong>
                </div>

                <div className="text-[11px] text-red-300 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {item.breachType === "UNACKNOWLEDGED_CODE_RED"
                    ? "Breach: Unacknowledged CODE RED alert exceeding 120 seconds"
                    : item.breachType === "DELAYED_DISPATCH"
                    ? "Breach: Active incident exceeding 5 minutes without field responder dispatch"
                    : "Breach: Delayed on-scene arrival exceeding 30 minutes"}
                </div>

                <div className="pt-2 border-t border-red-900/40 text-right">
                  <Link
                    href={`/emergencyos/incidents/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-300 hover:text-white"
                  >
                    Open Command Console
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downgrade Review & Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow space-y-3">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            Supervisor Code Red Downgrade Log ({downgrades.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            Immutable Clinical Override Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Incident #</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Downgraded To</th>
                <th className="py-3 px-4">Supervisor</th>
                <th className="py-3 px-4">Approved At</th>
                <th className="py-3 px-4">Clinical Justification</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {downgrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No Code Red incidents have been downgraded in system history.
                  </td>
                </tr>
              ) : (
                downgrades.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {inc.incidentNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {inc.callerName || "Member"}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase bg-amber-600 text-white">
                        {inc.classification.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {inc.downgradedBy?.name ||
                        inc.downgradedBy?.email ||
                        "Supervisor"}
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      {inc.downgradeApprovedAt
                        ? new Date(inc.downgradeApprovedAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {inc.downgradeReason || "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/emergencyos/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
