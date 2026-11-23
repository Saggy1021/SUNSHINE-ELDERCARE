"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  MonthlyReportSummary,
  MemberMonthlyStatementData,
  VisitDrilldownItem,
} from "@/lib/services/monthly-excess-hours";
import {
  getMonthlyCareHoursStatementAction,
  finalizeMonthlyCareHoursStatementAction,
  exportMonthlyStatementCSVAction,
  listAvailableStatementMonthsAction,
} from "@/app/actions/monthly-excess-hours";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Clock,
  User,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  ArrowRight,
  Eye,
  X,
} from "lucide-react";
import Link from "next/link";

interface AvailableMonth {
  monthKey: string;
  monthLabel: string;
  isSaved: boolean;
  status?: string;
}

interface MonthlyExcessHoursClientProps {
  initialMonthKey: string;
  initialReport: MonthlyReportSummary | null;
  availableMonths: AvailableMonth[];
  userRole?: string;
}

export function MonthlyExcessHoursClient({
  initialMonthKey,
  initialReport,
  availableMonths: initialAvailableMonths,
  userRole,
}: MonthlyExcessHoursClientProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthKey);
  const [report, setReport] = useState<MonthlyReportSummary | null>(initialReport);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>(initialAvailableMonths);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "EXCESS_ONLY" | "WITHIN_ONLY">("ALL");
  const [selectedDrilldown, setSelectedDrilldown] = useState<MemberMonthlyStatementData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load report data for selected month
  const loadReport = async (monthKey: string, forceRefresh: boolean = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getMonthlyCareHoursStatementAction(monthKey, forceRefresh);
      if (res.success && res.report) {
        setReport(res.report);
      } else {
        setErrorMessage(res.error || "Failed to load monthly care hours statement.");
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "An unexpected error occurred loading statement.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    loadReport(newMonth, false);
  };

  const handleRefresh = () => {
    loadReport(selectedMonth, true);
  };

  const handleFinalize = async () => {
    if (!confirm(`Are you sure you want to finalize the statement for ${report?.monthLabel || selectedMonth}? This will permanently snapshot historical care hours and package entitlements for management audit.`)) {
      return;
    }

    setIsFinalizing(true);
    setErrorMessage(null);
    try {
      const res = await finalizeMonthlyCareHoursStatementAction(selectedMonth);
      if (res.success && res.report) {
        setReport(res.report);
        setSuccessMessage(`Statement for ${res.report.monthLabel} finalized and preserved successfully.`);
        // Refresh months list
        const mRes = await listAvailableStatementMonthsAction();
        if (mRes.success && mRes.months) {
          setAvailableMonths(mRes.months);
        }
      } else {
        setErrorMessage(res.error || "Failed to finalize statement.");
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Error finalizing statement.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const res = await exportMonthlyStatementCSVAction(selectedMonth);
      if (res.success && res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename || `Sunshine-Care-Hours-${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || "Failed to export CSV.");
      }
    } catch (e: any) {
      alert(e?.message || "Error exporting CSV.");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered and sorted member rows
  const filteredItems = useMemo(() => {
    if (!report?.items) return [];

    return report.items.filter((item) => {
      // Search filter
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.memberName.toLowerCase().includes(query) ||
        item.memberId.toLowerCase().includes(query) ||
        item.packageName.toLowerCase().includes(query);

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "EXCESS_ONLY") {
        matchesStatus = item.hasExcess;
      } else if (statusFilter === "WITHIN_ONLY") {
        matchesStatus = !item.hasExcess;
      }

      return matchesSearch && matchesStatus;
    });
  }, [report, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Print-only corporate statement header */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sunshine Eldercare</h1>
            <p className="text-xs text-slate-600">Comprehensive Elder Care & Operations Management</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-800">Monthly Final Excess Care Hours Statement</h2>
            <p className="text-xs text-slate-600">Report Month: {report?.monthLabel}</p>
          </div>
        </div>
      </div>

      {/* Screen Header & Top Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B08A4A] tracking-wider uppercase">
            <span>Care Operations</span>
            <span>•</span>
            <span>Management Statements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#091329] dark:text-white flex items-center gap-3 mt-1">
            <FileText className="h-7 w-7 text-[#B08A4A]" />
            Monthly Excess Care Hours Statement
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Consolidated month-end care-hour entitlement and completed visit duration statement. Identifies members exceeding permitted care hours with full visit drill-down.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={isLoading}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#091329] dark:text-white text-sm font-semibold rounded-xl pl-3 pr-8 py-2.5 shadow-2xs focus:ring-2 focus:ring-[#B08A4A] focus:outline-hidden disabled:opacity-60 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.monthLabel} {m.isSaved ? "(Preserved)" : "(Live)"}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            title="Recalculate live completed visit durations"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Finalize / Snapshot Button */}
          {report?.status !== "FINALIZED" && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing || isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-2xs transition-colors disabled:opacity-50"
            >
              <Lock className="h-4 w-4 text-emerald-600" />
              <span>{isFinalizing ? "Finalizing..." : "Finalize Statement"}</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExportingCSV || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-2xs transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[#B08A4A]" />
            <span>{isExportingCSV ? "Exporting..." : "Export CSV"}</span>
          </button>

          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold text-white bg-[#091329] hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
          >
            <Printer className="h-4 w-4 text-amber-400" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Statement Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Statement Updated</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Strict Business Rule & Policy Notice Callout */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40 p-4 sm:p-5 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0">
          <Info className="h-5 w-5" />
        </div>
        <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-200/90 leading-relaxed space-y-1">
          <p className="font-bold text-[#091329] dark:text-amber-300">
            Management Review Notice & Strict Non-Billing Policy
          </p>
          <p>
            This statement is generated solely for operational tracking and management oversight. Excess hours reflect actual completed visits registered by caregivers exceeding package quotas. <strong>The system does not automatically invoice members, issue payment requests, or initiate Razorpay billing transactions.</strong> Management will independently review operational circumstances before deciding any policy actions.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Members */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Members
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#091329] dark:text-white">
              {report?.totalMembers ?? 0}
            </span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
        </div>

        {/* Exceeded Quota */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
              In Excess
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 dark:text-rose-400">
              {report?.excessMembers ?? 0}
            </span>
            <span className="text-xs font-medium text-rose-600">exceeded</span>
          </div>
        </div>

        {/* Within Quota */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Within Quota
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {report?.withinEntitlementMembers ?? 0}
            </span>
            <span className="text-xs font-medium text-emerald-600">on track</span>
          </div>
        </div>

        {/* Entitlement Hours */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Entitled Hours
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#091329] dark:text-white">
              {report?.totalEntitledHours?.toFixed(1) ?? "0.0"}
            </span>
            <span className="text-xs font-medium text-slate-500">hrs</span>
          </div>
        </div>

        {/* Consumed Hours */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Used
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {report?.totalUsedHours?.toFixed(1) ?? "0.0"}
            </span>
            <span className="text-xs font-medium text-slate-500">actual hrs</span>
          </div>
        </div>

        {/* Excess Hours Total */}
        <div className="rounded-2xl border border-rose-300 bg-rose-100/60 dark:bg-rose-900/30 dark:border-rose-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">
              Total Excess
            </span>
            <Clock className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-800 dark:text-rose-300">
              +{report?.totalExcessHours?.toFixed(1) ?? "0.0"}
            </span>
            <span className="text-xs font-bold text-rose-700">hrs</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs print:hidden">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Member ID, Name, or Package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#B08A4A] focus:outline-hidden"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-slate-900 text-[#091329] dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All Members ({report?.totalMembers ?? 0})
          </button>
          <button
            onClick={() => setStatusFilter("EXCESS_ONLY")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              statusFilter === "EXCESS_ONLY"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-rose-700 dark:text-rose-400 hover:text-rose-800"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Exceeded ({report?.excessMembers ?? 0})
          </button>
          <button
            onClick={() => setStatusFilter("WITHIN_ONLY")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "WITHIN_ONLY"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
            }`}
          >
            Within Quota ({report?.withinEntitlementMembers ?? 0})
          </button>
        </div>
      </div>

      {/* Main Statement Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {/* Table Banner */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#091329] dark:text-white">
              Statement for {report?.monthLabel || selectedMonth}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                report?.status === "FINALIZED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {report?.status === "FINALIZED" ? "Preserved Final Statement" : "Active Draft / Continuous"}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredItems.length} of {report?.totalMembers ?? 0} members
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Membership / Package</th>
                <th className="py-3 px-4 text-right">Monthly Entitlement</th>
                <th className="py-3 px-4 text-right">Total Hours Used</th>
                <th className="py-3 px-4 text-right">Remaining Hours</th>
                <th className="py-3 px-4 text-right">Excess Hours</th>
                <th className="py-3 px-4 text-center">Completed Visits</th>
                <th className="py-3 px-4 text-center">Report Month</th>
                <th className="py-3 px-4 text-center print:hidden">Audit Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-800 dark:text-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-base">No member statements match criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing search filters or refreshing the month.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.memberId}
                    className={`transition-colors ${
                      item.hasExcess
                        ? "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 font-medium"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Member ID */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-[#091329] dark:text-amber-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {item.memberId}
                      </span>
                    </td>

                    {/* Member Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.memberName}
                      </div>
                    </td>

                    {/* Membership / Package */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                        <Package className="h-3 w-3 text-blue-600" />
                        {item.packageName}
                      </span>
                    </td>

                    {/* Monthly Entitlement */}
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {item.monthlyEntitlement.toFixed(1)} hrs
                    </td>

                    {/* Total Hours Used */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {item.totalHoursUsed.toFixed(1)} hrs
                    </td>

                    {/* Remaining Hours */}
                    <td className="py-3 px-4 text-right font-medium">
                      {item.remainingHours > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          {item.remainingHours.toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-slate-400">0.0 hrs</span>
                      )}
                    </td>

                    {/* Excess Hours */}
                    <td className="py-3 px-4 text-right">
                      {item.hasExcess ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs">
                          <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                          +{item.excessHours.toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">0.0 hrs</span>
                      )}
                    </td>

                    {/* Completed Visits */}
                    <td className="py-3 px-4 text-center font-medium">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.completedVisits} {item.completedVisits === 1 ? "visit" : "visits"}
                      </span>
                    </td>

                    {/* Report Month */}
                    <td className="py-3 px-4 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                      {item.reportMonth}
                    </td>

                    {/* Audit Drilldown Action */}
                    <td className="py-3 px-4 text-center print:hidden">
                      <button
                        onClick={() => setSelectedDrilldown(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#091329] dark:text-amber-300 hover:text-[#B08A4A] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Drilldown ({item.visits.length})</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#091329] dark:text-white flex items-center gap-2">
                  <span>Visit Audit Log:</span>
                  <span className="font-mono text-amber-600">{selectedDrilldown.memberId}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDrilldown.memberName} • {selectedDrilldown.packageName} • {selectedDrilldown.reportMonth}
                </p>
              </div>
              <button
                onClick={() => setSelectedDrilldown(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Summary Cards */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Monthly Entitlement</span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedDrilldown.monthlyEntitlement.toFixed(1)} hrs
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total Completed</span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedDrilldown.totalHoursUsed.toFixed(1)} hrs
                </p>
              </div>
              <div
                className={`p-3 rounded-xl border text-center ${
                  selectedDrilldown.hasExcess
                    ? "bg-rose-50 border-rose-200 dark:bg-rose-950/40"
                    : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40"
                }`}
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase">Excess / Quota</span>
                <p
                  className={`text-lg font-extrabold mt-1 ${
                    selectedDrilldown.hasExcess ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {selectedDrilldown.hasExcess
                    ? `+${selectedDrilldown.excessHours.toFixed(1)} hrs`
                    : "0.0 hrs (Within Quota)"}
                </p>
              </div>
            </div>

            {/* Modal Body: Visits List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Contributing Completed Visits ({selectedDrilldown.visits.length})
              </h4>
              {selectedDrilldown.visits.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No completed care visits recorded in this calendar month.
                </div>
              ) : (
                selectedDrilldown.visits.map((v, idx) => (
                  <div
                    key={v.visitId || idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#B08A4A]" />
                        {v.dateKey}
                      </span>
                      <span className="font-black text-slate-900 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded">
                        {v.durationHours.toFixed(1)} hrs ({v.durationMinutes} mins)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-500">Arrival:</span> {v.actualArrival || "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Departure:</span> {v.actualDeparture || "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Staff:</span> {v.caregiver}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Recipient:</span> {v.elderName}
                      </div>
                    </div>

                    {v.workDescription && (
                      <div className="pt-1 text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-100 dark:border-slate-800">
                        &quot;{v.workDescription}&quot;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedDrilldown(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
