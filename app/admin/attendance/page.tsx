"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserX,
  Palmtree,
  History,
  Edit3,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";

interface DutySessionItem {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  status: "ON_DUTY" | "COMPLETED" | "SYSTEM_CLOSED" | "ADMIN_CLOSED";
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface RosterEmployee {
  employeeId: string;
  id: string;
  name: string;
  designation: string;
  department: string;
  dutyStatus: "ON_DUTY" | "OFF_DUTY" | "ON_LEAVE";
  todayDurationMinutes: number;
  todayDurationFormatted: string;
  firstDutyIn: string | null;
  lastDutyOut: string | null;
  sessionsCount: number;
  sessions: DutySessionItem[];
}

interface AttendanceRosterData {
  date: string;
  dateFormatted: string;
  metrics: {
    totalEmployees: number;
    onDuty: number;
    offDuty: number;
    onLeave: number;
    totalSessionsToday: number;
  };
  roster: RosterEmployee[];
}

interface LeaveRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  adminRemarks?: string | null;
  createdAt: string;
}

const getTodayISTString = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
};

export default function AttendanceAdminPage() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayISTString());
  const [activeTab, setActiveTab] = useState<"roster" | "leave">("roster");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AttendanceRosterData | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Drawer / Modal states
  const [selectedEmployeeSessions, setSelectedEmployeeSessions] = useState<RosterEmployee | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<RosterEmployee | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionStartTime, setCorrectionStartTime] = useState("");
  const [correctionEndTime, setCorrectionEndTime] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Leave review modal state
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequestItem | null>(null);
  const [leaveAdminRemarks, setLeaveAdminRemarks] = useState("");
  const [isSubmittingLeaveReview, setIsSubmittingLeaveReview] = useState(false);

  const fetchRoster = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?date=${selectedDate}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
        setSelectedEmployeeSessions((prev) => {
          if (!prev) return null;
          const fresh = resData.roster.find((r: RosterEmployee) => r.id === prev.id);
          return fresh || prev;
        });
      }
    } catch (e) {
      console.error("Failed to fetch attendance roster:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(`/api/admin/leave-requests`);
      const resData = await res.json();
      if (resData.success && resData.requests) {
        setLeaveRequests(resData.requests);
      }
    } catch (e) {
      console.error("Failed to fetch leave requests:", e);
    }
  };

  useEffect(() => {
    fetchRoster(false);
    fetchLeaveRequests();

    // Silent background synchronization every 3 seconds without UI disruption
    const interval = setInterval(() => {
      fetchRoster(true);
      fetchLeaveRequests();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleManualCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !correctionReason.trim()) {
      alert("Please provide a valid employee and mandatory correction reason.");
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      const payload: any = {
        employeeId: correctionTarget.id,
        reason: correctionReason.trim(),
      };
      if (correctionStartTime) {
        payload.startTime = new Date(`${selectedDate}T${correctionStartTime}:00+05:30`).toISOString();
      }
      if (correctionEndTime) {
        payload.endTime = new Date(`${selectedDate}T${correctionEndTime}:00+05:30`).toISOString();
      }

      const res = await fetch(`/api/admin/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        alert("Attendance correction saved successfully.");
        setCorrectionTarget(null);
        setCorrectionReason("");
        setCorrectionStartTime("");
        setCorrectionEndTime("");
        fetchRoster();
      } else {
        alert(result.error || "Failed to record correction");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleLeaveReviewSubmit = async (action: "APPROVE" | "REJECT") => {
    if (!reviewingLeave) return;

    setIsSubmittingLeaveReview(true);
    try {
      const res = await fetch(`/api/admin/leave-requests/${reviewingLeave.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminRemarks: leaveAdminRemarks.trim() || undefined,
        }),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        alert(`Leave request ${action === "APPROVE" ? "Approved" : "Rejected"} successfully.`);
        setReviewingLeave(null);
        setLeaveAdminRemarks("");
        fetchLeaveRequests();
        fetchRoster();
      } else {
        alert(result.error || "Failed to update leave request");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsSubmittingLeaveReview(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.roster || data.roster.length === 0) {
      alert("No attendance records to export.");
      return;
    }

    const headers = [
      "Employee ID",
      "Full Name",
      "Designation",
      "Department",
      "Duty Status",
      "First Duty In (IST)",
      "Last Duty Out (IST)",
      "Total Duty (Minutes)",
      "Total Duty Formatted",
      "Sessions Count",
    ];

    const rows = data.roster.map((emp) => [
      `"${emp.employeeId}"`,
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${emp.designation}"`,
      `"${emp.department}"`,
      `"${emp.dutyStatus}"`,
      `"${emp.firstDutyIn || "—"}"`,
      `"${emp.lastDutyOut || "—"}"`,
      emp.todayDurationMinutes,
      `"${emp.todayDurationFormatted}"`,
      emp.sessionsCount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sunshine-Attendance-Roster-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRoster = useMemo(() => {
    if (!data?.roster) return [];
    return data.roster.filter((emp) => {
      const matchesSearch =
        searchQuery === "" ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || emp.dutyStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data?.roster, searchQuery, statusFilter]);

  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter((l) => l.status === "PENDING").length;
  }, [leaveRequests]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Care Operations</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Attendance</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#B08A4A]" />
            Employee Duty & Attendance Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor real-time duty sessions, audit work shifts, review employee leave requests, and export records for payroll compliance.
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border/70 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-[#B08A4A]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm bg-transparent border-none outline-none font-medium text-slate-800 dark:text-slate-200"
            />
          </div>

          <button
            onClick={() => fetchRoster(false)}
            disabled={loading}
            className="p-2.5 rounded-lg border border-border/70 bg-card hover:bg-slate-50 text-slate-700 transition shadow-sm"
            title="Refresh Attendance Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#B08A4A]" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#091329] hover:bg-[#162850] text-white text-sm font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#B08A4A]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Employees */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-[#091329] dark:text-white">
            {data?.metrics?.totalEmployees ?? "—"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Registered caregivers & ops</p>
        </div>

        {/* On Duty */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              On Duty
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
            {data?.metrics?.onDuty ?? "0"}
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">Currently active on shift</p>
        </div>

        {/* Off Duty */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Off Duty</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {data?.metrics?.offDuty ?? "—"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Shift completed / inactive</p>
        </div>

        {/* On Leave */}
        <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">On Leave</span>
            <Palmtree className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-800 dark:text-purple-300">
            {data?.metrics?.onLeave ?? "0"}
          </div>
          <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80 mt-1">Approved absence</p>
        </div>

        {/* Total Sessions Today */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Sessions Today</span>
            <Clock className="w-4 h-4 text-[#B08A4A]" />
          </div>
          <div className="text-2xl font-bold text-[#091329] dark:text-white">
            {data?.metrics?.totalSessionsToday ?? "—"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Logged duty sessions</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("roster")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "roster"
              ? "border-[#B08A4A] text-[#091329] dark:text-white"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Attendance Roster</span>
        </button>

        <button
          onClick={() => setActiveTab("leave")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px flex items-center gap-2 ${
            activeTab === "leave"
              ? "border-[#B08A4A] text-[#091329] dark:text-white"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>Leave Requests</span>
          {pendingLeavesCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Attendance Roster */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          {/* Controls: Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, or designation..."
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
              {["ALL", "ON_DUTY", "OFF_DUTY", "ON_LEAVE"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === st
                      ? "bg-[#091329] text-white shadow-sm"
                      : "bg-background border border-border/80 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {st === "ALL"
                    ? "All"
                    : st === "ON_DUTY"
                    ? "On Duty"
                    : st === "OFF_DUTY"
                    ? "Off Duty"
                    : "On Leave"}
                </button>
              ))}
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-card border border-border/70 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/70 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role & Dept</th>
                    <th className="py-3 px-4">Duty Status</th>
                    <th className="py-3 px-4">First Duty In</th>
                    <th className="py-3 px-4">Last Duty Out</th>
                    <th className="py-3 px-4">Total Shift Time</th>
                    <th className="py-3 px-4">Sessions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B08A4A] mb-2" />
                        Loading employee duty roster...
                      </td>
                    </tr>
                  ) : filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No employees found matching the filters for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                        {/* Employee Name & ID */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#091329] dark:text-white">
                            {emp.name}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {emp.employeeId}
                          </div>
                        </td>

                        {/* Role & Dept */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {emp.designation}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {emp.department}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          {emp.dutyStatus === "ON_DUTY" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              ON DUTY
                            </span>
                          ) : emp.dutyStatus === "ON_LEAVE" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Palmtree className="w-3 h-3 text-purple-600" />
                              ON LEAVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              OFF DUTY
                            </span>
                          )}
                        </td>

                        {/* First Duty In */}
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {emp.firstDutyIn || "—"}
                        </td>

                        {/* Last Duty Out */}
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {emp.lastDutyOut || "—"}
                        </td>

                        {/* Total Shift Time */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {emp.todayDurationFormatted}
                          </span>
                        </td>

                        {/* Sessions Count */}
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {emp.sessionsCount} session{emp.sessionsCount !== 1 ? "s" : ""}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedEmployeeSessions(emp)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold border border-border/80 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition"
                              title="View Duty History"
                            >
                              <History className="w-3.5 h-3.5 inline mr-1 text-[#B08A4A]" />
                              History
                            </button>
                            <button
                              onClick={() => {
                                setCorrectionTarget(emp);
                                setCorrectionReason("");
                                setCorrectionStartTime("");
                                setCorrectionEndTime("");
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#091329] hover:bg-[#162850] text-white transition"
                              title="Manual Correction"
                            >
                              <Edit3 className="w-3.5 h-3.5 inline mr-1 text-[#B08A4A]" />
                              Correct
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Leave Requests */}
      {activeTab === "leave" && (
        <div className="space-y-4">
          <div className="bg-card border border-border/70 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-border/70 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Window</th>
                    <th className="py-3 px-4">Total Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Applied At</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#091329] dark:text-white">
                            {req.employeeName}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {req.employeeId} • {req.designation}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {req.startDate} – {req.endDate}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {req.totalDays} day{req.totalDays !== 1 ? "s" : ""}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-xs text-slate-600 dark:text-slate-400 truncate">
                          {req.reason}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : req.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {req.createdAt}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {req.status === "PENDING" ? (
                            <button
                              onClick={() => {
                                setReviewingLeave(req);
                                setLeaveAdminRemarks("");
                              }}
                              className="px-3 py-1 rounded-md text-xs font-semibold bg-[#091329] hover:bg-[#162850] text-white transition"
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Session History Modal */}
      {selectedEmployeeSessions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border/60 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-[#091329] dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#B08A4A]" />
                  Shift Sessions — {selectedEmployeeSessions.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Employee ID: {selectedEmployeeSessions.employeeId} • Date: {data?.dateFormatted || selectedDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeSessions(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {selectedEmployeeSessions.sessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No duty sessions logged for this employee on this date.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEmployeeSessions.sessions.map((sess, idx) => (
                    <div
                      key={sess.id || idx}
                      className="border border-border/70 rounded-xl p-4 bg-background flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#091329] dark:text-white">
                            {sess.startTime} – {sess.endTime || "Active (Ongoing)"}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              sess.status === "ON_DUTY"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                        {sess.notes && (
                          <p className="text-xs text-muted-foreground">{sess.notes}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-[#B08A4A]">
                          {sess.durationMinutes != null
                            ? `${Math.floor(sess.durationMinutes / 60)}h ${sess.durationMinutes % 60}m`
                            : "In Progress"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/60 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedEmployeeSessions(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#091329] text-white hover:bg-[#162850]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border/60 bg-slate-50 dark:bg-slate-900/60">
              <h3 className="text-lg font-bold text-[#091329] dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#B08A4A]" />
                Audited Manual Attendance Correction
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: {correctionTarget.name} ({correctionTarget.employeeId}) for {selectedDate}
              </p>
            </div>

            <form onSubmit={handleManualCorrectionSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  All manual changes are permanently logged to the <strong>AttendanceCorrectionLog</strong> table with your administrator identity and mandatory justification.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clock-In Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={correctionStartTime}
                    onChange={(e) => setCorrectionStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clock-Out Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={correctionEndTime}
                    onChange={(e) => setCorrectionEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Audit Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Employee forgot to end shift after completing home visit, verified with supervisor..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  disabled={isSubmittingCorrection}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-border/80 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#091329] hover:bg-[#162850] text-white flex items-center gap-1.5"
                >
                  {isSubmittingCorrection && <RefreshCw className="w-4 h-4 animate-spin text-[#B08A4A]" />}
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Review Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border/60 bg-slate-50 dark:bg-slate-900/60">
              <h3 className="text-lg font-bold text-[#091329] dark:text-white flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-[#B08A4A]" />
                Review Leave Application
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reviewingLeave.employeeName} ({reviewingLeave.employeeId})
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-border/60 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Requested Window:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {reviewingLeave.startDate} to {reviewingLeave.endDate} ({reviewingLeave.totalDays} days)
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Reason stated:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                    "{reviewingLeave.reason}"
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Remarks / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={leaveAdminRemarks}
                  onChange={(e) => setLeaveAdminRemarks(e.target.value)}
                  placeholder="e.g. Approved. Temporary caregiver coverage assigned to Salt Lake district..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  disabled={isSubmittingLeaveReview}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-border/80 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleLeaveReviewSubmit("REJECT")}
                  disabled={isSubmittingLeaveReview}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleLeaveReviewSubmit("APPROVE")}
                  disabled={isSubmittingLeaveReview}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
