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
} from "@/app/actions/care-schedule";
import {
  formatDateKey,
  formatTimeIST,
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
  const [selectedCaregiver, setSelectedCaregiver] = useState("ALL");
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
        caregiverId: selectedCaregiver !== "ALL" ? selectedCaregiver : undefined,
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
    selectedCaregiver,
    selectedStatus,
    selectedCategory,
    selectedLocation,
  ]);

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
  const isFiltered =
    !!memberSearch ||
    selectedCaregiver !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedCategory !== "ALL" ||
    !!selectedLocation;

  const resetFilters = () => {
    setMemberSearch("");
    setSelectedCaregiver("ALL");
    setSelectedStatus("ALL");
    setSelectedCategory("ALL");
    setSelectedLocation("");
  };

  const todayKey = formatDateKey(new Date());

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Confirmed
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Scheduled
          </span>
        );
      case "WAITLISTED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Waitlisted
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Category Badge Helper
  const renderCategoryBadge = (category: string) => {
    if (category === "Ad-hoc") {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
          Ad-hoc
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        Scheduled
      </span>
    );
  };

  // Range Display Title
  const rangeDisplayTitle = useMemo(() => {
    if (view === "day") {
      return formatDateIST(currentDate);
    } else if (view === "month") {
      return formatMonthRangeDisplay(currentDate);
    } else {
      return formatWeekRangeDisplay(weekDays);
    }
  }, [view, currentDate, weekDays]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-[#091329]" /> Visit Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Care visit scheduling, caregiver allocations, and multi-day dispatch calendar.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggles */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200/90 shadow-2xs">
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                  view === v
                    ? "bg-white text-[#091329] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => refreshVisits()}
            disabled={loading}
            title="Refresh Visits"
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Schedule Visit Button */}
          {canManage && (
            <button
              onClick={() => {
                setScheduleModalDefaultDate(formatDateKey(currentDate));
                setShowScheduleModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-semibold rounded-lg hover:bg-[#162850] shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" /> Schedule Visit
            </button>
          )}
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
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
            <span className="text-xs text-slate-400 animate-pulse font-medium">Updating...</span>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{visits.length}</span> care visit
          {visits.length === 1 ? "" : "s"}
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

          {/* Caregiver Filter */}
          <div>
            <select
              value={selectedCaregiver}
              onChange={(e) => setSelectedCaregiver(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            >
              <option value="ALL">All Caregivers</option>
              {initialFormData.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.designation})
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
          <div>
            <input
              type="text"
              placeholder="Filter by city / area..."
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
            />
          </div>
        </div>

        {isFiltered && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
            <span>Filtered results active</span>
            <button
              onClick={resetFilters}
              className="text-[#B08A4A] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Reset all filters
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)}>
            <X className="h-4 w-4 text-rose-400 hover:text-rose-600" />
          </button>
        </div>
      )}

      {/* Main Calendar View Area */}
      {view === "week" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
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
                        {dayVisits.map((visit) => (
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

                            {/* Assigned Caregiver */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {visit.assignedCaregiver ? (
                                <span className="font-medium truncate">
                                  {visit.assignedCaregiver.firstName} {visit.assignedCaregiver.lastName}
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
                        ))}

                        {canManage && (
                          <button
                            onClick={() => {
                              setScheduleModalDefaultDate(dayKey);
                              setShowScheduleModal(true);
                            }}
                            className="w-full py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-900 border border-dashed border-slate-200 hover:border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Visit
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

      {/* Daily View */}
      {view === "day" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#091329]">{formatDateIST(currentDate)}</h2>
              <p className="text-xs text-slate-500">{formatDayOfWeek(currentDate)} schedule timeline</p>
            </div>
            {canManage && (
              <button
                onClick={() => {
                  setScheduleModalDefaultDate(formatDateKey(currentDate));
                  setShowScheduleModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#091329] text-white text-xs font-semibold rounded-lg hover:bg-[#162850] shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Visit
              </button>
            )}
          </div>

          {visits.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
              <CalendarIcon className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No visits scheduled for this day</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No care appointments are planned for {formatDateIST(currentDate)}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className="py-4 hover:bg-slate-50/60 transition-colors rounded-lg px-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {visit.elder.firstName} {visit.elder.lastName}
                      </span>
                      {visit.member.memberId && (
                        <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded">
                          {visit.member.memberId}
                        </span>
                      )}
                      {renderCategoryBadge(visit.category)}
                      {renderStatusBadge(visit.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatTimeIST(visit.scheduledStart)} – {formatTimeIST(visit.scheduledEnd)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        Caregiver: {visit.assignedCaregiver ? `${visit.assignedCaregiver.firstName} ${visit.assignedCaregiver.lastName}` : "Unassigned"}
                      </span>
                      {visit.member.serviceAddress && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {visit.member.serviceAddress}
                        </span>
                      )}
                    </div>
                    {visit.operationalNotes && (
                      <p className="text-xs text-slate-500 italic line-clamp-1">{visit.operationalNotes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVisit(visit);
                      }}
                      className="text-xs font-semibold text-[#091329] hover:underline inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View Details <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly View */}
      {view === "month" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Generate calendar matrix */}
            {(() => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const firstDayOfMonth = new Date(year, month, 1);
              const daysInMonth = new Date(year, month + 1, 0).getDate();

              // 0 is Sunday, convert so Monday is 0
              let startOffset = firstDayOfMonth.getDay() - 1;
              if (startOffset === -1) startOffset = 6;

              const cells = [];
              for (let i = 0; i < startOffset; i++) {
                cells.push(<div key={`blank-${i}`} className="min-h-[90px] bg-slate-50/40 rounded-lg border border-transparent" />);
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVisit(v);
                          }}
                          className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-medium"
                        >
                          {v.elder.firstName}: {formatTimeIST(v.scheduledStart)}
                        </div>
                      ))}
                      {cellVisits.length > 2 && (
                        <p className="text-[9px] text-slate-400 font-semibold pl-1">
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
      {/* 1. VISIT DETAILS MODAL                                                    */}
      {/* ========================================================================= */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                    <span className="text-xs text-slate-400">UNASSIGNED MID</span>
                  )}
                </div>
              </div>

              {/* Schedule & Timing */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule & Duration</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block mb-0.5">Scheduled Date</span>
                    <span className="font-semibold text-slate-900 text-sm">{formatDateIST(selectedVisit.scheduledStart)}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block mb-0.5">Scheduled Time (IST)</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatTimeIST(selectedVisit.scheduledStart)} – {formatTimeIST(selectedVisit.scheduledEnd)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Caregiver */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Caregiver</p>
                {selectedVisit.assignedCaregiver ? (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedVisit.assignedCaregiver.firstName} {selectedVisit.assignedCaregiver.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedVisit.assignedCaregiver.designation} · ID: {selectedVisit.assignedCaregiver.employeeId}
                      </p>
                    </div>
                    {selectedVisit.assignedCaregiver.contactNumber && (
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {selectedVisit.assignedCaregiver.contactNumber}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 font-semibold pt-1">No caregiver currently assigned.</p>
                )}
              </div>

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
      {/* 2. SCHEDULE NEW VISIT MODAL                                               */}
      {/* ========================================================================= */}
      {showScheduleModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                  date: fd.get("date") as string,
                  startTime: fd.get("startTime") as string,
                  endTime: fd.get("endTime") as string,
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
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={scheduleModalDefaultDate || formatDateKey(new Date())}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time *</label>
                  <input type="time" name="startTime" defaultValue="10:00" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time *</label>
                  <input type="time" name="endTime" defaultValue="12:00" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
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
                <label className="block font-semibold text-slate-700 mb-1">Assign Caregiver</label>
                <select name="assignedEmpId" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs">
                  <option value="">-- Leave Unassigned --</option>
                  {initialFormData.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.designation})
                    </option>
                  ))}
                </select>
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
                  disabled={actionLoading}
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
      {/* 3. RESCHEDULE VISIT MODAL                                                 */}
      {/* ========================================================================= */}
      {showRescheduleModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                const date = fd.get("date") as string;
                const startTime = fd.get("startTime") as string;
                const endTime = fd.get("endTime") as string;
                const reason = fd.get("reason") as string;

                const newStart = `${date}T${startTime}:00`;
                const newEnd = `${date}T${endTime}:00`;

                const res = await rescheduleCareVisit(selectedVisit.id, newStart, newEnd, reason);
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
                <label className="block font-semibold text-slate-700 mb-1">New Date *</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={formatDateKey(selectedVisit.scheduledStart)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    defaultValue="10:00"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    defaultValue="12:00"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  name="reason"
                  placeholder="e.g. Member requested morning slot, Caregiver unavailable..."
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
                  disabled={actionLoading}
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
      {/* 4. CHANGE STATUS MODAL                                                    */}
      {/* ========================================================================= */}
      {showStatusModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
      {/* 5. FULL EDIT VISIT MODAL                                                  */}
      {/* ========================================================================= */}
      {showEditModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                const date = fd.get("date") as string;
                const startTime = fd.get("startTime") as string;
                const endTime = fd.get("endTime") as string;

                const res = await updateCareVisitDetails(selectedVisit.id, {
                  scheduledStart: `${date}T${startTime}:00`,
                  scheduledEnd: `${date}T${endTime}:00`,
                  assignedEmpId: (fd.get("assignedEmpId") as string) || null,
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
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={formatDateKey(selectedVisit.scheduledStart)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    defaultValue={formatTimeIST(selectedVisit.scheduledStart).includes(":") ? formatTimeIST(selectedVisit.scheduledStart) : "10:00"}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    defaultValue={formatTimeIST(selectedVisit.scheduledEnd).includes(":") ? formatTimeIST(selectedVisit.scheduledEnd) : "12:00"}
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
                <label className="block font-semibold text-slate-700 mb-1">Assigned Caregiver</label>
                <select
                  name="assignedEmpId"
                  defaultValue={selectedVisit.assignedCaregiver?.id || ""}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Unassigned --</option>
                  {initialFormData.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.designation})
                    </option>
                  ))}
                </select>
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
                  disabled={actionLoading}
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
      {/* 6. CANCEL VISIT CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {showCancelModal && selectedVisit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
