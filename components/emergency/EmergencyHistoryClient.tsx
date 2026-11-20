"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Flame,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  ShieldCheck,
} from "lucide-react";
import { getEmergencyHistoryAction } from "@/app/actions/emergency";

interface HistoryIncident {
  id: string;
  incidentNumber: string;
  status: string;
  classification: string;
  memberId: string | null;
  callerName: string | null;
  callerPhone: string | null;
  triggerSource: string;
  triggeredAt: string | Date;
  resolvedAt: string | Date | null;
  resolutionNotes: string | null;
  assignedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  } | null;
  _count: {
    logs: number;
  };
}

interface EmergencyHistoryClientProps {
  initialIncidents: HistoryIncident[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

export function EmergencyHistoryClient({
  initialIncidents,
  initialTotal,
  initialPage,
  initialTotalPages,
}: EmergencyHistoryClientProps) {
  const [incidents, setIncidents] = useState<HistoryIncident[]>(initialIncidents);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isPending, startTransition] = useTransition();

  const handleSearch = (newPage = 1) => {
    startTransition(async () => {
      try {
        const res = await getEmergencyHistoryAction({
          query: searchQuery,
          classification: selectedClassification,
          status: selectedStatus,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: newPage,
          limit: 20,
        });

        setIncidents(res.incidents as any);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (err: any) {
        alert(err.message || "Failed to search history");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300">
            <Archive className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Emergency Incident Archive & Audit Records
            </h1>
            <p className="text-xs text-slate-400">
              Permanent immutable log of past emergency calls, triage actions & resolutions
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Total Archived Incidents: <span className="font-bold text-white">{total}</span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Query input */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
                placeholder="Incident #, member name, phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Classification */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Classification
            </label>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
            >
              <option value="ALL">All Classifications</option>
              <option value="CODE_RED">Code Red</option>
              <option value="CODE_YELLOW">Code Yellow</option>
              <option value="CODE_GREEN">Code Green</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="RESOLVED">Resolved</option>
              <option value="TRIGGERED">Triggered</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="RESPONDER_ON_SCENE">On Scene</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Action button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => handleSearch(1)}
              disabled={isPending}
              className="w-full py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              {isPending ? "Filtering..." : "Apply Filters"}
            </button>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Incident #</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Member / Caller</th>
                <th className="py-3 px-4">Triggered Time</th>
                <th className="py-3 px-4">Responder</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching archived incidents found.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const isRed = incident.classification === "CODE_RED";
                  return (
                    <tr
                      key={incident.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {incident.incidentNumber}
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                            isRed
                              ? "bg-red-600 text-white"
                              : incident.classification === "CODE_YELLOW"
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {incident.classification.replace("_", " ")}
                        </span>
                      </td>

                      {/* Member */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {incident.callerName || "Unknown Member"}
                        </div>
                        {incident.memberId && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {incident.memberId}
                          </div>
                        )}
                        {incident.callerPhone && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {incident.callerPhone}
                          </div>
                        )}
                      </td>

                      {/* Triggered Time */}
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(incident.triggeredAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Responder */}
                      <td className="py-3 px-4 text-slate-300">
                        {incident.assignedEmployee ? (
                          <span>
                            {incident.assignedEmployee.firstName}{" "}
                            {incident.assignedEmployee.lastName} (
                            {incident.assignedEmployee.employeeId})
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            incident.status === "RESOLVED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : incident.status === "TRIGGERED"
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {incident.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/emergencyos/incidents/${incident.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                        >
                          View Console
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {page} of {totalPages} ({total} total)
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || isPending}
                onClick={() => handleSearch(page - 1)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isPending}
                onClick={() => handleSearch(page + 1)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
