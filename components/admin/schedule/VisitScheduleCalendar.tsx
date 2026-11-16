"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
  Edit2,
  CalendarClock,
  Ban,
  ArrowRight,
  Tag,
  Shield,
  FileText,
} from "lucide-react";
import {
  ScheduleVisitDTO,
  CareScheduleFormData,
  getScheduleVisits,
  createScheduleVisit,
  updateCareVisitDetails,
  rescheduleCareVisit,
  updateCareVisitStatus,
  cancelCareVisit,
  getEmployeeAvailability,
} from "@/app/actions/care-schedule";
import {
  formatDateKey,
  formatTimeIST,
  formatTimeInputIST,
  formatDateIST,
  formatDayOfWeek,
  getWeekDays,
  formatWeekRangeDisplay,
  formatMonthRangeDisplay,
  getKolkataDateParts,
} from "./schedule-date-utils";

interface VisitScheduleCalendarProps {
  initialVisits: ScheduleVisitDTO[];
  initialFormData: CareScheduleFormData;
  canManage: boolean;
}

type CalendarView = "day" | "week" | "month";

interface EmployeeAvailabilityItem {
  employeeId: string;
  available: boolean;
  conflictTime?: string;
  conflictReason?: string;
}

export function VisitScheduleCalendar({
  initialVisits,
  initialFormData,
  canManage,
}: VisitScheduleCalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [visits, setVisits] = useState<ScheduleVisitDTO[]>(initialVisits);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Modals & Panels
  const [selectedVisit, setSelectedVisit] = useState<ScheduleVisitDTO | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalDefaultDate, setScheduleModalDefaultDate] = useState<string>("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states for mutations
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Schedule Modal Form & Availability State
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleStartTime, setScheduleStartTime] = useState<string>("10:00");
  const [scheduleEndTime, setScheduleEndTime] = useState<string>("12:00");
  const [scheduleAssignedEmp, setScheduleAssignedEmp] = useState<string>("");
  const [scheduleEmpAvailability, setScheduleEmpAvailability] = useState<EmployeeAvailabilityItem[]>([]);
  const [scheduleAvailLoading, setScheduleAvailLoading] = useState(false);

  // Edit Modal Form & Availability State
  const [editDate, setEditDate] = useState<string>("");
  const [editStartTime, setEditStartTime] = useState<string>("10:00");
  const [editEndTime, setEditEndTime] = useState<string>("12:00");
  const [editAssignedEmp, setEditAssignedEmp] = useState<string>("");
  const [editEmpAvailability, setEditEmpAvailability] = useState<EmployeeAvailabilityItem[]>([]);
  const [editAvailLoading, setEditAvailLoading] = useState(false);

  // Reschedule Modal Form & Availability State
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>("10:00");
  const [rescheduleEndTime, setRescheduleEndTime] = useState<string>("12:00");
  const [rescheduleAssignedEmp, setRescheduleAssignedEmp] = useState<string>("");
  const [rescheduleEmpAvailability, setRescheduleEmpAvailability] = useState<EmployeeAvailabilityItem[]>([]);
  const [rescheduleAvailLoading, setRescheduleAvailLoading] = useState(false);

  // Determine current active date range based on view
  const { dateRangeStart, dateRangeEnd, weekDays } = useMemo(() => {
    if (view === "day") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { dateRangeStart: start, dateRangeEnd: end, weekDays: [start] };
    } else if (view === "month") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { dateRangeStart: start, dateRangeEnd: end, weekDays: [] };
    } else {
      // Default: "week"
      const days = getWeekDays(currentDate);
      const start = new Date(days[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(days[6]);
      end.setHours(23, 59, 59, 999);
      return { dateRangeStart: start, dateRangeEnd: end, weekDays: days };
    }
  }, [currentDate, view]);

  // Fetch visits whenever date range or filters change
  const refreshVisits = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await getScheduleVisits({
        startDate: dateRangeStart.toISOString(),
        endDate: dateRangeEnd.toISOString(),
        memberSearch: memberSearch || undefined,
        caregiverId: selectedEmployeeFilter !== "ALL" ? selectedEmployeeFilter : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        location: selectedLocation || undefined,
      });
      setVisits(data);
    } catch (err: any) {
      console.error("Failed to load visits:", err);
      setActionError(err?.message || "Failed to load visits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dateRangeStart.toISOString(),
    dateRangeEnd.toISOString(),
    memberSearch,
    selectedEmployeeFilter,
    selectedStatus,
    selectedCategory,
    selectedLocation,
  ]);

  // Sync Schedule Modal initial state
  useEffect(() => {
    if (showScheduleModal) {
      setScheduleDate(scheduleModalDefaultDate || formatDateKey(new Date()));
      setScheduleStartTime("10:00");
      setScheduleEndTime("12:00");
      setScheduleAssignedEmp("");
      setActionError(null);
    }
  }, [showScheduleModal, scheduleModalDefaultDate]);

  // Dynamic Availability query for Schedule Modal
  useEffect(() => {
    if (!showScheduleModal || !scheduleDate || !scheduleStartTime || !scheduleEndTime) return;
    let active = true;
    setScheduleAvailLoading(true);
    getEmployeeAvailability({
      date: scheduleDate,
      startTime: scheduleStartTime,
      endTime: scheduleEndTime,
    })
      .then((res) => {
        if (active) setScheduleEmpAvailability(res);
      })
      .catch((err) => console.error("Availability query error:", err))
      .finally(() => {
        if (active) setScheduleAvailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showScheduleModal, scheduleDate, scheduleStartTime, scheduleEndTime]);

  // Sync Edit Modal initial state
  useEffect(() => {
    if (showEditModal && selectedVisit) {
      setEditDate(formatDateKey(selectedVisit.scheduledStart));
      setEditStartTime(formatTimeInputIST(selectedVisit.scheduledStart));
      setEditEndTime(formatTimeInputIST(selectedVisit.scheduledEnd));
      setEditAssignedEmp(selectedVisit.assignedEmployee?.id || selectedVisit.assignedCaregiver?.id || "");
      setActionError(null);
    }
  }, [showEditModal, selectedVisit]);

  // Dynamic Availability query for Edit Modal
  useEffect(() => {
    if (!showEditModal || !selectedVisit || !editDate || !editStartTime || !editEndTime) return;
    let active = true;
    setEditAvailLoading(true);
    getEmployeeAvailability({
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      excludeVisitId: selectedVisit.id,
    })
      .then((res) => {
        if (active) setEditEmpAvailability(res);
      })
      .catch((err) => console.error("Availability query error:", err))
      .finally(() => {
        if (active) setEditAvailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showEditModal, selectedVisit, editDate, editStartTime, editEndTime]);

  // Sync Reschedule Modal initial state
  useEffect(() => {
    if (showRescheduleModal && selectedVisit) {
      setRescheduleDate(formatDateKey(selectedVisit.scheduledStart));
      setRescheduleStartTime(formatTimeInputIST(selectedVisit.scheduledStart));
      setRescheduleEndTime(formatTimeInputIST(selectedVisit.scheduledEnd));
      setRescheduleAssignedEmp(selectedVisit.assignedEmployee?.id || selectedVisit.assignedCaregiver?.id || "");
      setActionError(null);
    }
  }, [showRescheduleModal, selectedVisit]);

  // Dynamic Availability query for Reschedule Modal
  useEffect(() => {
    if (!showRescheduleModal || !selectedVisit || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return;
    let active = true;
    setRescheduleAvailLoading(true);
    getEmployeeAvailability({
      date: rescheduleDate,
      startTime: rescheduleStartTime,
      endTime: rescheduleEndTime,
      excludeVisitId: selectedVisit.id,
    })
      .then((res) => {
        if (active) setRescheduleEmpAvailability(res);
      })
      .catch((err) => console.error("Availability query error:", err))
      .finally(() => {
        if (active) setRescheduleAvailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showRescheduleModal, selectedVisit, rescheduleDate, rescheduleStartTime, rescheduleEndTime]);

  // Date Navigation Handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (view === "day") {
      next.setDate(next.getDate() - 1);
    } else if (view === "week") {
      next.setDate(next.getDate() - 7);
    } else if (view === "month") {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === "day") {
      next.setDate(next.getDate() + 1);
    } else if (view === "week") {
      next.setDate(next.getDate() + 7);
    } else if (view === "month") {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group visits by local date key (YYYY-MM-DD in IST)
  const visitsByDate = useMemo(() => {
    const map = new Map<string, ScheduleVisitDTO[]>();
    for (const v of visits) {
      const key = formatDateKey(v.scheduledStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [visits]);

  // Filter Active Indicators
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (memberSearch.trim()) count++;
    if (selectedEmployeeFilter !== "ALL") count++;
    if (selectedStatus !== "ALL") count++;
    if (selectedCategory !== "ALL") count++;
    if (selectedLocation.trim()) count++;
    return count;
  }, [memberSearch, selectedEmployeeFilter, selectedStatus, selectedCategory, selectedLocation]);

  const clearFilters = () => {
    setMemberSearch("");
    setSelectedEmployeeFilter("ALL");
    setSelectedStatus("ALL");
    setSelectedCategory("ALL");
    setSelectedLocation("");
  };

  // Status Badge UI Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Confirmed
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Scheduled
          </span>
        );
      case "WAITLISTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Waitlisted
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" /> In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Category Badge UI Helper
  const renderCategoryBadge = (category: "Scheduled" | "Ad-hoc") => {
    if (category === "Ad-hoc") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
          Ad-hoc
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        Scheduled
      </span>
    );
  };

  // Header Title based on active view
  const rangeDisplayTitle = useMemo(() => {
    if (view === "day") {
      return formatDateIST(currentDate);
    } else if (view === "week") {
      return formatWeekRangeDisplay(weekDays);
    } else {
      return formatMonthRangeDisplay(currentDate);
    }
  }, [view, currentDate, weekDays]);

  const todayKey = formatDateKey(new Date());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#091329]" /> Visit Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Care visit scheduling, employee allocations, and multi-day dispatch calendar.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshVisits()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Schedule"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {canManage && (
            <button
              onClick={() => {
                setScheduleModalDefaultDate(formatDateKey(new Date()));
                setShowScheduleModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#091329] rounded-lg hover:bg-[#162850] transition-colors shadow-2xs"
            >
              <Plus className="h-4 w-4" /> Schedule Visit
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Date Navigation + View Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Navigation & Date Display */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              onClick={handlePrev}
              aria-label="Previous date range"
              className="p-2 hover:bg-slate-50 border-r border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              aria-label="Next date range"
              className="p-2 hover:bg-slate-50 border-l border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="text-base font-bold text-[#091329] tracking-tight">
            {rangeDisplayTitle}
          </span>

          {loading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Updating...
            </span>
          )}
        </div>

        {/* View Switcher: Day, Week, Month */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setView("day")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              view === "day"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              view === "week"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              view === "month"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Member Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search member, elder, MID..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            />
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            >
              <option value="ALL">All Employees</option>
              {initialFormData.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.displayName || `${emp.firstName} ${emp.lastName} (${emp.designation})`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            >
              <option value="ALL">All Categories</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Ad-hoc">Ad-hoc</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter location / address..."
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            />
          </div>
        </div>

        {/* Active Filters Row */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Filtering by {activeFiltersCount} active criteria · {visits.length} visit{visits.length === 1 ? "" : "s"} found
            </span>
            <button
              onClick={clearFilters}
              className="text-[#091329] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Operation failed</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WEEKLY MULTI-DAY VIEW (PRIMARY / REFERENCE INSPIRED)                   */}
      {/* ========================================================================= */}
      {view === "week" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Horizontal scroll container for full multi-day view */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[1100px] divide-x divide-slate-200 border-b border-slate-200">
              {weekDays.map((dayDate) => {
                const dayKey = formatDateKey(dayDate);
                const isToday = dayKey === todayKey;
                const dayVisits = visitsByDate.get(dayKey) || [];

                return (
                  <div
                    key={dayKey}
                    className={`p-3 text-center transition-colors ${
                      isToday ? "bg-amber-50/40" : "bg-slate-50/60"
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {formatDayOfWeek(dayDate)}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span
                        className={`text-sm font-bold ${
                          isToday
                            ? "h-6 w-6 rounded-full bg-[#091329] text-white flex items-center justify-center text-xs"
                            : "text-slate-900"
                        }`}
                      >
                        {getKolkataDateParts(dayDate).day}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(dayDate)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          dayVisits.length > 0
                            ? "bg-slate-200/80 text-slate-800"
                            : "bg-transparent text-slate-400"
                        }`}
                      >
                        {dayVisits.length} {dayVisits.length === 1 ? "visit" : "visits"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day Columns Body */}
            <div className="grid grid-cols-7 min-w-[1100px] divide-x divide-slate-100 min-h-[480px] bg-slate-50/20">
              {weekDays.map((dayDate) => {
                const dayKey = formatDateKey(dayDate);
                const dayVisits = visitsByDate.get(dayKey) || [];
                const isToday = dayKey === todayKey;

                return (
                  <div
                    key={`col-${dayKey}`}
                    className={`p-3 space-y-3 flex flex-col ${
                      isToday ? "bg-amber-50/15" : ""
                    }`}
                  >
                    {dayVisits.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-400">
                        <p className="text-xs">No visits</p>
                        {canManage && (
                          <button
                            onClick={() => {
                              setScheduleModalDefaultDate(dayKey);
                              setShowScheduleModal(true);
                            }}
                            className="mt-2 text-[11px] font-semibold text-[#091329] hover:underline inline-flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> Add Visit
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {dayVisits.map((visit) => {
                          const assignedPerson = visit.assignedEmployee || visit.assignedCaregiver;
                          return (
                            <div
                              key={visit.id}
                              onClick={() => setSelectedVisit(visit)}
                              className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-[#091329]/60 hover:shadow-sm transition-all cursor-pointer space-y-2.5 text-left group"
                            >
                              {/* Badges row */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                {renderCategoryBadge(visit.category)}
                                {renderStatusBadge(visit.status)}
                              </div>

                              {/* Recipient & Member */}
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-[#091329] line-clamp-1">
                                  {visit.elder.firstName} {visit.elder.lastName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {visit.member.memberId ? (
                                    <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1 rounded">
                                      {visit.member.memberId}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                      {visit.member.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Time & Duration */}
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {formatTimeIST(visit.scheduledStart)} – {formatTimeIST(visit.scheduledEnd)}
                                </span>
                              </div>

                              {/* Assigned Employee */}
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {assignedPerson ? (
                                  <span className="font-medium truncate">
                                    {assignedPerson.firstName} {assignedPerson.lastName}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                                    Unassigned
                                  </span>
                                )}
                              </div>

                              {/* Address Snippet */}
                              {visit.member.serviceAddress && (
                                <div className="flex items-start gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="line-clamp-1">{visit.member.serviceAddress}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {canManage && (
                          <button
                            onClick={() => {
                              setScheduleModalDefaultDate(dayKey);
                              setShowScheduleModal(true);
                            }}
                            className="w-full py-1.5 text-center text-[11px] font-medium text-slate-500 hover:text-[#091329] border border-dashed border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
                          >
                            + Add Visit
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DAILY VIEW (CHRONOLOGICAL TIMELINE)                                    */}
      {/* ========================================================================= */}
      {view === "day" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#091329]">
              Schedule for {formatDateIST(currentDate)}
            </h2>
            <span className="text-xs text-slate-500">
              {(visitsByDate.get(formatDateKey(currentDate)) || []).length} visits scheduled
            </span>
          </div>

          {(() => {
            const dayKey = formatDateKey(currentDate);
            const dayVisits = visitsByDate.get(dayKey) || [];

            if (dayVisits.length === 0) {
              return (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CalendarDays className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm">No care visits scheduled for this date.</p>
                  {canManage && (
                    <button
                      onClick={() => {
                        setScheduleModalDefaultDate(dayKey);
                        setShowScheduleModal(true);
                      }}
                      className="mt-2 px-3 py-1.5 text-xs font-semibold bg-[#091329] text-white rounded-lg hover:bg-[#162850]"
                    >
                      Schedule Visit
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {dayVisits.map((visit) => {
                  const assignedPerson = visit.assignedEmployee || visit.assignedCaregiver;
                  return (
                    <div
                      key={visit.id}
                      onClick={() => setSelectedVisit(visit)}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#091329]/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#091329]">
                            {visit.elder.firstName} {visit.elder.lastName}
                          </span>
                          {visit.member.memberId && (
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              {visit.member.memberId}
                            </span>
                          )}
                          {renderCategoryBadge(visit.category)}
                          {renderStatusBadge(visit.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTimeIST(visit.scheduledStart)} – {formatTimeIST(visit.scheduledEnd)}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            Employee: {assignedPerson ? `${assignedPerson.firstName} ${assignedPerson.lastName}` : "Unassigned"}
                          </span>
                        </div>
                        {visit.member.serviceAddress && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {visit.member.serviceAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400 font-medium">
                        Click for details <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONTHLY VIEW (CALENDAR GRID)                                           */}
      {/* ========================================================================= */}
      {view === "month" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();

              const firstDayOfMonth = new Date(year, month, 1);
              const daysInMonth = new Date(year, month + 1, 0).getDate();

              let startingDay = firstDayOfMonth.getDay(); // 0 is Sunday
              startingDay = startingDay === 0 ? 6 : startingDay - 1; // Align to Monday = 0

              const cells = [];
              for (let i = 0; i < startingDay; i++) {
                cells.push(
                  <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-slate-50/40 rounded-lg border border-transparent" />
                );
              }

              for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = new Date(year, month, d);
                const cellKey = formatDateKey(cellDate);
                const isToday = cellKey === todayKey;
                const cellVisits = visitsByDate.get(cellKey) || [];

                cells.push(
                  <div
                    key={cellKey}
                    onClick={() => {
                      setCurrentDate(cellDate);
                      setView("day");
                    }}
                    className={`min-h-[100px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isToday
                        ? "border-[#091329] bg-amber-50/20"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? "h-5 w-5 rounded-full bg-[#091329] text-white flex items-center justify-center text-[10px]"
                            : "text-slate-700"
                        }`}
                      >
                        {d}
                      </span>
                      {cellVisits.length > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {cellVisits.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {cellVisits.slice(0, 2).map((v) => (
                        <div
                          key={v.id}
                          className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-800"
                        >
                          {formatTimeIST(v.scheduledStart)} · {v.elder.firstName}
                        </div>
                      ))}
                      {cellVisits.length > 2 && (
                        <p className="text-[9px] text-slate-400 font-medium pl-1">
                          +{cellVisits.length - 2} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CARE VISIT DETAILS MODAL                                         */}
      {/* ========================================================================= */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#B08A4A]" /> Care Visit Details
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">Visit ID: {selectedVisit.id}</p>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm">
              {/* Badges bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {renderCategoryBadge(selectedVisit.category)}
                  {renderStatusBadge(selectedVisit.status)}
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Plan: <span className="font-semibold text-slate-800">{selectedVisit.carePlanName}</span>
                </span>
              </div>

              {/* Member & Elder Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Care Recipient</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedVisit.elder.firstName} {selectedVisit.elder.lastName}
                  </p>
                  <p className="text-xs text-slate-500">Relationship: {selectedVisit.elder.relationship}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Member</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">{selectedVisit.member.name}</p>
                  {selectedVisit.member.memberId ? (
                    <span className="inline-block font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-0.5">
                      {selectedVisit.member.memberId}
                    </span>
                  ) : (
                    <p className="text-xs text-slate-400">{selectedVisit.member.email}</p>
                  )}
                </div>
              </div>

              {/* Timing */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule & Timing (IST)</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <CalendarIcon className="h-4 w-4 text-[#B08A4A]" />
                    {formatDateIST(selectedVisit.scheduledStart)}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {formatTimeIST(selectedVisit.scheduledStart)} – {formatTimeIST(selectedVisit.scheduledEnd)}
                  </div>
                </div>
                {(selectedVisit.actualStart || selectedVisit.actualEnd) && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>Actual Start: {selectedVisit.actualStart ? formatTimeIST(selectedVisit.actualStart) : "—"}</span>
                    <span>Actual End: {selectedVisit.actualEnd ? formatTimeIST(selectedVisit.actualEnd) : "—"}</span>
                  </div>
                )}
              </div>

              {/* Assigned Employee */}
              {(() => {
                const assignedPerson = selectedVisit.assignedEmployee || selectedVisit.assignedCaregiver;
                return (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Employee</p>
                    {assignedPerson ? (
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {assignedPerson.firstName} {assignedPerson.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {assignedPerson.designation} · ID: {assignedPerson.employeeId}
                          </p>
                        </div>
                        {assignedPerson.contactNumber && (
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {assignedPerson.contactNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 font-semibold pt-1">No employee currently assigned.</p>
                    )}
                  </div>
                );
              })()}

              {/* Address */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Address</p>
                <p className="text-xs text-slate-700 leading-relaxed pt-1">
                  {selectedVisit.member.serviceAddress || "Address not specified on profile."}
                </p>
              </div>

              {/* Operational Notes */}
              {selectedVisit.operationalNotes && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Notes</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedVisit.operationalNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={selectedVisit.member.userId ? `/admin/members/${selectedVisit.member.userId}` : "#"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#091329] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Member Details
              </Link>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Change Status
                  </button>
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Edit Visit
                  </button>
                  {selectedVisit.status !== "CANCELLED" && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Cancel Visit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SCHEDULE NEW VISIT MODAL                                         */}
      {/* ========================================================================= */}
      {showScheduleModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#B08A4A]" /> Schedule Care Visit
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                setActionError(null);
                const fd = new FormData(e.currentTarget);
                const res = await createScheduleVisit({
                  caseSelectionId: fd.get("caseSelectionId") as string,
                  date: scheduleDate,
                  startTime: scheduleStartTime,
                  endTime: scheduleEndTime,
                  assignedEmpId: (fd.get("assignedEmpId") as string) || undefined,
                  category: (fd.get("category") as any) || "Scheduled",
                  status: (fd.get("status") as string) || "SCHEDULED",
                  operationalNotes: fd.get("notes") as string,
                });
                setActionLoading(false);
                if (res.success) {
                  setShowScheduleModal(false);
                  refreshVisits();
                } else {
                  setActionError(res.error || "Failed to schedule visit.");
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Member / Care Recipient *</label>
                <select name="caseSelectionId" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                  <option value="">-- Select Member / Case --</option>
                  {initialFormData.cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date (IST) *</label>
                  <input
                    type="date"
                    name="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time (IST) *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time (IST) *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue="Scheduled" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ad-hoc">Ad-hoc</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select name="status" defaultValue="SCHEDULED" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="WAITLISTED">Waitlisted</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Assign Employee</label>
                  {scheduleAvailLoading && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Checking availability...
                    </span>
                  )}
                </div>
                <select
                  name="assignedEmpId"
                  value={scheduleAssignedEmp}
                  onChange={(e) => setScheduleAssignedEmp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {initialFormData.employees.map((emp) => {
                    const avail = scheduleEmpAvailability.find((a) => a.employeeId === emp.id);
                    const isOccupied = avail && !avail.available;
                    return (
                      <option
                        key={emp.id}
                        value={emp.id}
                        disabled={isOccupied}
                        className={isOccupied ? "text-slate-400 bg-slate-100 italic" : "text-slate-900"}
                      >
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`} — {isOccupied ? `Occupied (${avail?.conflictTime || "Overlapping Visit"})` : "Available"}
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const selectedAvail = scheduleEmpAvailability.find((a) => a.employeeId === scheduleAssignedEmp);
                  if (scheduleAssignedEmp && selectedAvail && !selectedAvail.available) {
                    return (
                      <p className="text-rose-600 text-[11px] font-medium mt-1">
                        ⚠️ The selected employee is occupied during this time window. Please choose an available employee.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Notes / Reason</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Details of care tasks, special instructions, or medical notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    Boolean(
                      scheduleAssignedEmp &&
                        scheduleEmpAvailability.find((a) => a.employeeId === scheduleAssignedEmp)?.available === false
                    )
                  }
                  className="px-5 py-2 bg-[#091329] text-white font-semibold rounded-lg hover:bg-[#162850] disabled:opacity-50"
                >
                  {actionLoading ? "Scheduling..." : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESCHEDULE VISIT MODAL                                           */}
      {/* ========================================================================= */}
      {showRescheduleModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-[#B08A4A]" /> Reschedule Visit
              </h3>
              <button onClick={() => setShowRescheduleModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                setActionError(null);
                const fd = new FormData(e.currentTarget);
                const reason = fd.get("reason") as string;

                const newStart = `${rescheduleDate}T${rescheduleStartTime}:00`;
                const newEnd = `${rescheduleDate}T${rescheduleEndTime}:00`;

                const res = await rescheduleCareVisit(
                  selectedVisit.id,
                  newStart,
                  newEnd,
                  reason,
                  rescheduleAssignedEmp || null
                );
                setActionLoading(false);
                if (res.success) {
                  setShowRescheduleModal(false);
                  setSelectedVisit(null);
                  refreshVisits();
                } else {
                  setActionError(res.error || "Failed to reschedule visit.");
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <p className="text-slate-600">
                Rescheduling visit for <span className="font-bold text-slate-900">{selectedVisit.elder.firstName} {selectedVisit.elder.lastName}</span>.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Date (IST) *</label>
                <input
                  type="date"
                  name="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time (IST) *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time (IST) *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Employee Availability & Conflict Banner */}
              {(() => {
                const assignedPerson = selectedVisit.assignedEmployee || selectedVisit.assignedCaregiver;
                const activeEmpId = rescheduleAssignedEmp || assignedPerson?.id;
                const empAvail = rescheduleEmpAvailability.find((a) => a.employeeId === activeEmpId);
                const isConflict = Boolean(activeEmpId && empAvail && !empAvail.available);

                return (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-slate-700">Assigned Employee</label>
                      {rescheduleAvailLoading && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Checking availability...
                        </span>
                      )}
                    </div>

                    {isConflict && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] space-y-1">
                        <p className="font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          Employee Conflict Detected
                        </p>
                        <p>
                          The assigned employee is occupied during this new time window ({empAvail?.conflictTime || "overlapping appointment"}). Please choose an available employee below or select another time slot.
                        </p>
                      </div>
                    )}

                    <select
                      name="assignedEmpId"
                      value={rescheduleAssignedEmp}
                      onChange={(e) => setRescheduleAssignedEmp(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-xs ${
                        isConflict ? "border-amber-400 bg-amber-50/40" : "border-slate-300"
                      }`}
                    >
                      <option value="">-- Leave Unassigned --</option>
                      {initialFormData.employees.map((emp) => {
                        const avail = rescheduleEmpAvailability.find((a) => a.employeeId === emp.id);
                        const isOccupied = avail && !avail.available;
                        return (
                          <option
                            key={emp.id}
                            value={emp.id}
                            disabled={isOccupied}
                            className={isOccupied ? "text-slate-400 bg-slate-100 italic" : "text-slate-900"}
                          >
                            {emp.displayName || `${emp.firstName} ${emp.lastName}`} — {isOccupied ? `Occupied (${avail?.conflictTime || "Overlapping Visit"})` : "Available"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  name="reason"
                  placeholder="e.g. Member requested morning slot, Employee unavailable..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    Boolean(
                      rescheduleAssignedEmp &&
                        rescheduleEmpAvailability.find((a) => a.employeeId === rescheduleAssignedEmp)?.available === false
                    )
                  }
                  className="px-5 py-2 bg-[#091329] text-white font-semibold rounded-lg hover:bg-[#162850] disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CHANGE STATUS MODAL                                              */}
      {/* ========================================================================= */}
      {showStatusModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#091329] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#B08A4A]" /> Update Visit Status
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                setActionError(null);
                const fd = new FormData(e.currentTarget);
                const status = fd.get("status") as string;
                const note = fd.get("note") as string;

                const res = await updateCareVisitStatus(selectedVisit.id, status, note);
                setActionLoading(false);
                if (res.success) {
                  setShowStatusModal(false);
                  setSelectedVisit(null);
                  refreshVisits();
                } else {
                  setActionError(res.error || "Failed to update status.");
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Status *</label>
                <select name="status" defaultValue={selectedVisit.status} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="WAITLISTED">Waitlisted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Note</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Optional status transition remark..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#091329] text-white font-semibold rounded-lg hover:bg-[#162850] disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: FULL EDIT VISIT MODAL                                            */}
      {/* ========================================================================= */}
      {showEditModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#B08A4A]" /> Edit Care Visit
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                setActionError(null);
                const fd = new FormData(e.currentTarget);

                const res = await updateCareVisitDetails(selectedVisit.id, {
                  date: editDate,
                  startTime: editStartTime,
                  endTime: editEndTime,
                  assignedEmpId: editAssignedEmp || null,
                  category: (fd.get("category") as any) || "Scheduled",
                  status: fd.get("status") as string,
                  operationalNotes: fd.get("notes") as string,
                });

                setActionLoading(false);
                if (res.success) {
                  setShowEditModal(false);
                  setSelectedVisit(null);
                  refreshVisits();
                } else {
                  setActionError(res.error || "Failed to edit visit.");
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date (IST) *</label>
                  <input
                    type="date"
                    name="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time (IST) *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time (IST) *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue={selectedVisit.category} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ad-hoc">Ad-hoc</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select name="status" defaultValue={selectedVisit.status} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="WAITLISTED">Waitlisted</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Assigned Employee</label>
                  {editAvailLoading && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Checking availability...
                    </span>
                  )}
                </div>
                <select
                  name="assignedEmpId"
                  value={editAssignedEmp}
                  onChange={(e) => setEditAssignedEmp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Unassigned --</option>
                  {initialFormData.employees.map((emp) => {
                    const avail = editEmpAvailability.find((a) => a.employeeId === emp.id);
                    const isOccupied = avail && !avail.available;
                    return (
                      <option
                        key={emp.id}
                        value={emp.id}
                        disabled={isOccupied}
                        className={isOccupied ? "text-slate-400 bg-slate-100 italic" : "text-slate-900"}
                      >
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`} — {isOccupied ? `Occupied (${avail?.conflictTime || "Overlapping Visit"})` : "Available"}
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const selectedAvail = editEmpAvailability.find((a) => a.employeeId === editAssignedEmp);
                  if (editAssignedEmp && selectedAvail && !selectedAvail.available) {
                    return (
                      <p className="text-rose-600 text-[11px] font-medium mt-1">
                        ⚠️ The selected employee is occupied during this time window. Please choose an available employee.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={selectedVisit.operationalNotes || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    Boolean(
                      editAssignedEmp &&
                        editEmpAvailability.find((a) => a.employeeId === editAssignedEmp)?.available === false
                    )
                  }
                  className="px-5 py-2 bg-[#091329] text-white font-semibold rounded-lg hover:bg-[#162850] disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CANCEL VISIT CONFIRMATION MODAL                                  */}
      {/* ========================================================================= */}
      {showCancelModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Ban className="h-4 w-4" /> Cancel Care Visit
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-white/80 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                setActionError(null);
                const fd = new FormData(e.currentTarget);
                const reason = fd.get("reason") as string;

                const res = await cancelCareVisit(selectedVisit.id, reason);
                setActionLoading(false);
                if (res.success) {
                  setShowCancelModal(false);
                  setSelectedVisit(null);
                  refreshVisits();
                } else {
                  setActionError(res.error || "Failed to cancel visit.");
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              <p className="text-slate-600">
                Are you sure you want to cancel the visit for <span className="font-bold text-slate-900">{selectedVisit.elder.firstName} {selectedVisit.elder.lastName}</span>?
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cancellation Reason *</label>
                <textarea
                  name="reason"
                  rows={2}
                  required
                  placeholder="State the reason for visit cancellation..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Keep Visit
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
