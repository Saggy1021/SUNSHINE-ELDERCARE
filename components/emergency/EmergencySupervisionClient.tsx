"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ShieldCheck,
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
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#091329] flex items-center gap-2">
              Supervisor Escalation & SLA Queue
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                Supervisor Authority
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Audit trail of Code Red classification changes, triage overrides & SLA alerts
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-500">Supervisory Status: </span>
          <span
            className={`font-bold ${
              isSupervisor ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {isSupervisor ? "Authorized Supervisor" : "Operator (Read Only)"}
          </span>
        </div>
      </div>

      {/* SLA Breach Watchlist */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#091329] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Active SLA Breach Alerts ({slaBreaches.length})
        </h2>

        {slaBreaches.length === 0 ? (
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              All active incidents are progressing within targeted SLA response windows (ACK &lt; 120s, Dispatch &lt; 5m).
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slaBreaches.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-red-50/70 border border-red-300 text-xs text-red-950 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-800">
                      {item.incidentNumber}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-black rounded bg-red-600 text-white uppercase">
                      {item.classification.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-red-700">
                    +{item.elapsedMinutes}m elapsed
                  </span>
                </div>

                <div className="text-slate-700">
                  Member:{" "}
                  <strong className="text-[#091329]">
                    {item.callerName || "Unknown Member"}
                  </strong>
                </div>

                <div className="text-[11px] text-red-800 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  {item.breachType === "UNACKNOWLEDGED_CODE_RED"
                    ? "Breach: Unacknowledged CODE RED alert exceeding 120 seconds"
                    : item.breachType === "DELAYED_DISPATCH"
                    ? "Breach: Active incident exceeding 5 minutes without field responder dispatch"
                    : "Breach: Delayed on-scene arrival exceeding 30 minutes"}
                </div>

                <div className="pt-2 border-t border-red-200 text-right">
                  <Link
                    href={`/emergencyos/incidents/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900"
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
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm space-y-3">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#091329] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#B08A4A]" />
            Supervisor Code Red Downgrade Log ({downgrades.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            Immutable Clinical Override Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Incident #</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Downgraded To</th>
                <th className="py-3 px-4">Supervisor</th>
                <th className="py-3 px-4">Approved At</th>
                <th className="py-3 px-4">Clinical Justification</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {downgrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No Code Red incidents have been downgraded in system history.
                  </td>
                </tr>
              ) : (
                downgrades.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#091329]">
                      {inc.incidentNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold text-[#091329]">
                      {inc.callerName || "Member"}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase bg-amber-600 text-white">
                        {inc.classification.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {inc.downgradedBy?.name ||
                        inc.downgradedBy?.email ||
                        "Supervisor"}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {inc.downgradeApprovedAt
                        ? new Date(inc.downgradeApprovedAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {inc.downgradeReason || "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/emergencyos/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-[#091329] hover:bg-[#162850] text-white transition-colors"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
