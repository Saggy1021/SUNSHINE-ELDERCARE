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
  Phone,
  ShieldCheck,
  Cake,
  Flame,
  Siren,
} from "lucide-react";
import { SearchableMemberSelect } from "./SearchableMemberSelect";
import { SearchableEmployeeSelect } from "./SearchableEmployeeSelect";
import { BirthdayCalendarView } from "./BirthdayCalendarView";
import { VisitStatusIndicator } from "./VisitStatusIndicator";
import {
  BirthdayCalendarPayload,
  BirthdayEntry,
  BirthdayCalendarService,
} from "@/lib/services/birthday-calendar";
import {
  ScheduleVisitDTO,
  CareScheduleFormData,
  getScheduleVisits,
  createScheduleVisit,
  updateCareVisitDetails,
  rescheduleCareVisit,
  updateCareVisitStatus,
  cancelCareVisit,
  assignCaregiverDirectly,
  getCancelledVisitsForCase,
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
  initialBirthdays?: BirthdayCalendarPayload;
  canManage: boolean;
}

type CalendarMode = "visits" | "birthdays";

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
  initialBirthdays,
  canManage,
}: VisitScheduleCalendarProps) {
  const [activeMode, setActiveMode] = useState<CalendarMode>("visits");
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

  // Direct Assignment State in Visit Details Modal
  const [directAssignEmpId, setDirectAssignEmpId] = useState<string>("");
  const [directAssignLoading, setDirectAssignLoading] = useState<boolean>(false);
  const [directAssignSuccess, setDirectAssignSuccess] = useState<boolean>(false);

  // Adhoc replacement cancelled visits
  const [caseCancelledVisits, setCaseCancelledVisits] = useState<Array<{ id: string; scheduledStart: string; cancellationReason: string | null; displayLabel: string }>>([]);
  const [replacementOriginalVisitId, setReplacementOriginalVisitId] = useState<string>("");

  useEffect(() => {
    if (selectedVisit) {
      setDirectAssignEmpId(selectedVisit.assignedEmployee?.id || selectedVisit.assignedCaregiver?.id || "");
      setDirectAssignSuccess(false);
    }
  }, [selectedVisit]);

  // Form states for mutations
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Schedule Modal Form & Availability State
  const [scheduleCaseSelectionId, setScheduleCaseSelectionId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleStartTime, setScheduleStartTime] = useState<string>("10:00");
  const [scheduleEndTime, setScheduleEndTime] = useState<string>("12:00");
  const [scheduleAssignedEmp, setScheduleAssignedEmp] = useState<string>("");
  const [scheduleEmpAvailability, setScheduleEmpAvailability] = useState<EmployeeAvailabilityItem[]>([]);
  const [scheduleAvailLoading, setScheduleAvailLoading] = useState(false);

  useEffect(() => {
    if (scheduleCaseSelectionId) {
      getCancelledVisitsForCase(scheduleCaseSelectionId)
        .then((v) => setCaseCancelledVisits(v))
        .catch(() => setCaseCancelledVisits([]));
    } else {
      setCaseCancelledVisits([]);
    }
  }, [scheduleCaseSelectionId]);

  // Edit Modal Form & Availability State
  const [editCaseSelectionId, setEditCaseSelectionId] = useState<string>("");
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

  // Live refresh: background polling every 10s ensures new emergency assignments & status changes appear in real-time
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
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
        if (isMounted) {
          setVisits(data);
        }
      } catch {
        // Silently retry next interval
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    dateRangeStart,
    dateRangeEnd,
    memberSearch,
    selectedEmployeeFilter,
    selectedStatus,
    selectedCategory,
    selectedLocation,
  ]);

  // Sync Schedule Modal initial state
  useEffect(() => {
    if (showScheduleModal) {
      setScheduleCaseSelectionId("");
      setScheduleDate(scheduleModalDefaultDate || formatDateKey(new Date()));
      setScheduleStartTime("10:00");
      setScheduleEndTime("12:00");
      setScheduleAssignedEmp("");
      setActionError(null);
    }
  }, [showScheduleModal, scheduleModalDefaultDate]);

  // Dynamic Availability query for Schedule Modal (debounced with validation guard)
  useEffect(() => {
    if (!showScheduleModal || !scheduleDate || !scheduleStartTime || !scheduleEndTime) return;
    if (scheduleEndTime <= scheduleStartTime) return;

    let active = true;
    const timer = setTimeout(() => {
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
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showScheduleModal, scheduleDate, scheduleStartTime, scheduleEndTime]);

  // Sync Edit Modal initial state
  useEffect(() => {
    if (showEditModal && selectedVisit) {
      setEditCaseSelectionId(selectedVisit.careCaseId || "");
      setEditDate(formatDateKey(selectedVisit.scheduledStart));
      setEditStartTime(formatTimeInputIST(selectedVisit.scheduledStart));
      setEditEndTime(formatTimeInputIST(selectedVisit.scheduledEnd));
      setEditAssignedEmp(selectedVisit.assignedEmployee?.id || selectedVisit.assignedCaregiver?.id || "");
      setActionError(null);
    }
  }, [showEditModal, selectedVisit]);

  // Dynamic Availability query for Edit Modal (debounced with validation guard)
  useEffect(() => {
    if (!showEditModal || !selectedVisit || !editDate || !editStartTime || !editEndTime) return;
    if (editEndTime <= editStartTime) return;

    let active = true;
    const timer = setTimeout(() => {
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
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
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

  // Dynamic Availability query for Reschedule Modal (debounced with validation guard)
  useEffect(() => {
    if (!showRescheduleModal || !selectedVisit || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) return;
    if (rescheduleEndTime <= rescheduleStartTime) return;

    let active = true;
    const timer = setTimeout(() => {
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
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
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

  // Group visits by local date key (YYYY-MM-DD in IST) and strictly sort chronologically by scheduled visit time
  const visitsByDate = useMemo(() => {
    const map = new Map<string, ScheduleVisitDTO[]>();
    for (const v of visits) {
      const key = formatDateKey(v.scheduledStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    // Strict chronological sort within each day based on scheduledStart
    for (const [key, dayVisits] of map.entries()) {
      dayVisits.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    }
    return map;
  }, [visits]);

  // Group birthdays by Month-Day key ("MM-DD") in IST for calendar badge display
  const birthdaysByDateKey = useMemo(() => {
    const map = new Map<string, BirthdayEntry[]>();
    if (!initialBirthdays?.allBirthdays) return map;
    for (const b of initialBirthdays.allBirthdays) {
      const monthStr = String(b.birthMonth).padStart(2, "0");
      const dayStr = String(b.birthDay).padStart(2, "0");
      const mdKey = `${monthStr}-${dayStr}`;
      if (!map.has(mdKey)) map.set(mdKey, []);
      map.get(mdKey)!.push(b);
    }
    return map;
  }, [initialBirthdays]);

  // Helper to get birthdays falling on any given calendar Date
  const getBirthdaysForDate = (date: Date): BirthdayEntry[] => {
    const parts = getKolkataDateParts(date);
    const mStr = String(parts.month).padStart(2, "0");
    const dStr = String(parts.day).padStart(2, "0");
    const entries = [...(birthdaysByDateKey.get(`${mStr}-${dStr}`) || [])];

    // If non-leap year and date is Feb 28, include leap day (Feb 29) birthdays
    if (!BirthdayCalendarService.isLeapYear(parts.year) && parts.month === 2 && parts.day === 28) {
      const leapEntries = birthdaysByDateKey.get("02-29") || [];
      entries.push(...leapEntries);
    }
    return entries;
  };

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
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Completed
          </span>
        );
      case "TRIGGERED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Triggered
          </span>
        );
      case "DISPATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Dispatched
          </span>
        );
      case "RESPONDER_ON_SCENE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" /> On Scene
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

  // Category & Recurrence Badge UI Helper
  const renderCategoryBadge = (visit: ScheduleVisitDTO) => {
    if (visit.isEmergency) {
      const isCodeRed = (visit.emergencyClassification || "CODE_RED") === "CODE_RED";
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
            isCodeRed
              ? "bg-red-600 text-white shadow-2xs"
              : "bg-amber-600 text-white shadow-2xs"
          }`}
        >
          <Flame className="w-3 h-3" />
          {visit.emergencyClassification ? visit.emergencyClassification.replace("_", " ") : "CODE RED"}
        </span>
      );
    }
    const isAdhoc = visit.occurrenceType === "ADHOC" || visit.category === "Ad-hoc";
    if (isAdhoc) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
          ADHOC
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
        RECURRING
      </span>
    );
  };

  const renderAssignmentBadge = (visit: ScheduleVisitDTO) => {
    if (visit.isEmergency) return null;
    const isAssigned = Boolean(visit.assignedEmployee || visit.assignedCaregiver);
    if (!isAssigned) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
          UNASSIGNED
        </span>
      );
    }
    return null;
  };

  // Status-based Card Border & Visual Styling Helper (Requirement 5 & 4)
  const getVisitCardBorderClasses = (visit: ScheduleVisitDTO) => {
    const isEmergency = Boolean(visit.isEmergency);
    const isCompleted = visit.status === "COMPLETED" || visit.status === "RESOLVED";

    if (isEmergency) {
      if (isCompleted) {
        // Completed emergency-linked Code Red entry: GREEN border
        return "border-2 border-emerald-500 bg-emerald-50/20 hover:border-emerald-600 shadow-2xs";
      }
      // Active Code Red emergency: prominent RED border / highlight
      return "border-2 border-red-500 bg-red-50/40 hover:border-red-600 shadow-sm ring-2 ring-red-400/25";
    }

    // Normal CareVisits
    if (isCompleted) {
      // Completed normal CareVisits: GREEN border
      return "border-2 border-emerald-500 bg-emerald-50/15 hover:border-emerald-600 shadow-2xs";
    }

    if (visit.status === "IN_PROGRESS") {
      return "border-2 border-purple-400 bg-purple-50/10 hover:border-purple-500 shadow-2xs";
    }

    if (visit.status === "WAITLISTED") {
      return "border-2 border-amber-300 bg-amber-50/20 hover:border-amber-400 shadow-2xs";
    }

    if (visit.status === "CANCELLED") {
      return "border border-rose-200 bg-rose-50/30 hover:border-rose-300 text-slate-800 shadow-2xs";
    }

    // Scheduled / Confirmed normal visits: retain existing styling
    return "border border-slate-200 hover:border-[#091329]/60 bg-white shadow-2xs";
  };

  const getMonthPillClasses = (visit: ScheduleVisitDTO) => {
    const isEmergency = Boolean(visit.isEmergency);
    const isCompleted = visit.status === "COMPLETED" || visit.status === "RESOLVED";

    if (isEmergency) {
      if (isCompleted) {
        return "bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold";
      }
      return "bg-red-50 text-red-900 border border-red-500 font-black";
    }

    if (isCompleted) {
      return "bg-emerald-50 text-emerald-800 border border-emerald-400 font-medium";
    }

    if (visit.status === "IN_PROGRESS") {
      return "bg-purple-50 text-purple-800 border border-purple-300 font-medium";
    }

    if (visit.status === "CANCELLED") {
      return "bg-rose-50 text-rose-800 border border-rose-200 font-medium";
    }

    return "bg-slate-100 text-slate-800 border border-slate-200 font-medium";
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
            Care visit scheduling, employee allocations, and central member birthday calendar.
          </p>
        </div>

        {/* Top Header Controls: Mode Switcher + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Navigation Mode Switcher: Care Visits vs Birthday Calendar */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveMode("visits")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeMode === "visits"
                  ? "bg-white text-[#091329] shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-slate-700" />
              Care Visits
            </button>
            <button
              onClick={() => setActiveMode("birthdays")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeMode === "birthdays"
                  ? "bg-white text-[#091329] shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Cake className="h-3.5 w-3.5 text-amber-600" />
              Birthday Calendar
              {initialBirthdays && initialBirthdays.stats.thisMonthCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  {initialBirthdays.stats.thisMonthCount}
                </span>
              )}
            </button>
          </div>

          {activeMode === "visits" && (
            <>
              <button
                onClick={() => refreshVisits()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                title="Refresh Schedule"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <Link
                href="/admin/care/excess-hours"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#091329] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs"
                title="Monthly Excess Care Hours Statement"
              >
                <FileText className="h-3.5 w-3.5 text-[#B08A4A]" />
                <span className="hidden sm:inline">Monthly Statement</span>
                <span className="sm:hidden">Statement</span>
              </Link>

              {canManage && (
                <button
                  onClick={() => {
                    setScheduleModalDefaultDate(formatDateKey(new Date()));
                    setShowScheduleModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#091329] rounded-lg hover:bg-[#162850] transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Adhoc Visit
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {activeMode === "birthdays" ? (
        initialBirthdays ? (
          <BirthdayCalendarView
            initialData={initialBirthdays}
            onSwitchToVisits={() => setActiveMode("visits")}
          />
        ) : (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            Loading Birthday Calendar...
          </div>
        )
      ) : (
        <>

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
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === "day"
              ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Day
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === "week"
              ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === "month"
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
                    className={`p-3 text-center transition-colors ${isToday ? "bg-amber-50/40" : "bg-slate-50/60"
                      }`}
                  >
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {formatDayOfWeek(dayDate)}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span
                        className={`text-sm font-bold ${isToday
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
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${dayVisits.length > 0
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
                const dayBirthdays = getBirthdaysForDate(dayDate);
                const isToday = dayKey === todayKey;

                return (
                  <div
                    key={`col-${dayKey}`}
                    className={`p-3 space-y-3 flex flex-col ${isToday ? "bg-amber-50/15" : ""
                      }`}
                  >
                    {/* Informational Birthday Banner in Day Column */}
                    {dayBirthdays.map((b) => (
                      <div
                        key={`week-bday-${b.id}`}
                        onClick={() => setActiveMode("birthdays")}
                        className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 shadow-2xs hover:bg-amber-100 transition-colors cursor-pointer space-y-1 text-left"
                        title={`🎂 Birthday: ${b.fullName} (${b.memberId})`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <Cake className="h-3 w-3 text-amber-600" /> Birthday
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-slate-600">
                            {b.memberId}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate">
                          {b.fullName}
                        </div>
                        {b.turningAge && (
                          <div className="text-[10px] text-amber-700 font-medium">
                            Turns {b.turningAge} {b.personType === "SPOUSE" ? "• Spouse" : ""}
                          </div>
                        )}
                      </div>
                    ))}

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
                          const isEmergency = Boolean(visit.isEmergency);

                          return (
                            <div
                              key={visit.id}
                              onClick={() => setSelectedVisit(visit)}
                              className={`p-3.5 rounded-xl transition-all cursor-pointer space-y-2.5 text-left group relative ${getVisitCardBorderClasses(
                                visit
                              )}`}
                            >
                              {/* Top-Right Status Indicator */}
                              <div className="absolute top-3 right-3 shrink-0">
                                <VisitStatusIndicator status={visit.status} size="md" />
                              </div>

                              {/* Badges row */}
                              <div className="flex items-center gap-1.5 flex-wrap pr-7">
                                {renderCategoryBadge(visit)}
                                {isEmergency && visit.emergencyIncidentNumber && (
                                  <span className="font-mono text-[10px] font-bold text-red-700 bg-red-100/90 border border-red-200 px-1 rounded">
                                    {visit.emergencyIncidentNumber}
                                  </span>
                                )}
                              </div>

                              {/* Recipient & Member */}
                              <div className="pr-7">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-[#091329] line-clamp-1">
                                  {visit.elder.firstName} {visit.elder.lastName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {visit.member.memberId ? (
                                    <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1 rounded">
                                      {visit.member.memberId}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                      {visit.member.name}
                                    </span>
                                  )}
                                  {/* Member Phone */}
                                  {visit.member.mobileNumber && (
                                    <span
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 hover:text-slate-900 font-mono"
                                    >
                                      <Phone className="h-2.5 w-2.5 text-slate-400" />
                                      <a href={`tel:${visit.member.mobileNumber}`} className="hover:underline">
                                        {visit.member.mobileNumber}
                                      </a>
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

                              {/* Assigned Employee & Phone */}
                              <div className="flex items-center justify-between gap-1 text-[11px] text-slate-700">
                                <div className="flex items-center gap-1.5 truncate">
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
                                {assignedPerson?.contactNumber && (
                                  <a
                                    href={`tel:${assignedPerson.contactNumber}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] font-mono text-slate-500 hover:text-slate-900 flex items-center gap-0.5 shrink-0"
                                    title={`Call ${assignedPerson.firstName}: ${assignedPerson.contactNumber}`}
                                  >
                                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                                    <span>{assignedPerson.contactNumber}</span>
                                  </a>
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
                      className="mt-2 px-3 py-1.5 text-xs font-semibold bg-[#091329] text-white rounded-lg hover:bg-[#162850] cursor-pointer"
                    >
                      Adhoc Visit
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {dayVisits.map((visit) => {
                  const assignedPerson = visit.assignedEmployee || visit.assignedCaregiver;
                  const isEmergency = Boolean(visit.isEmergency);

                  return (
                    <div
                      key={visit.id}
                      onClick={() => setSelectedVisit(visit)}
                      className={`p-4 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative ${getVisitCardBorderClasses(
                        visit
                      )}`}
                    >
                      {/* Top-Right Status Indicator */}
                      <div className="absolute top-3.5 right-3.5 shrink-0">
                        <VisitStatusIndicator status={visit.status} size="md" />
                      </div>

                      <div className="space-y-1.5 flex-1 pr-8 sm:pr-10">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#091329]">
                            {visit.elder.firstName} {visit.elder.lastName}
                          </span>
                          {visit.member.memberId && (
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              {visit.member.memberId}
                            </span>
                          )}
                          {isEmergency && visit.emergencyIncidentNumber && (
                            <span className="font-mono text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                              {visit.emergencyIncidentNumber}
                            </span>
                          )}
                          {renderCategoryBadge(visit)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTimeIST(visit.scheduledStart)} – {formatTimeIST(visit.scheduledEnd)}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            Employee: {assignedPerson ? `${assignedPerson.firstName} ${assignedPerson.lastName}` : "Unassigned"}
                            {assignedPerson?.contactNumber && (
                              <a
                                href={`tel:${assignedPerson.contactNumber}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono text-slate-600 hover:text-slate-900 ml-1 inline-flex items-center gap-0.5"
                              >
                                <Phone className="h-3 w-3 text-slate-400" /> {assignedPerson.contactNumber}
                              </a>
                            )}
                          </span>
                          {visit.member.mobileNumber && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                Member Phone:
                                <a
                                  href={`tel:${visit.member.mobileNumber}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-mono text-slate-700 hover:text-slate-900 font-semibold"
                                >
                                  {visit.member.mobileNumber}
                                </a>
                              </span>
                            </>
                          )}
                        </div>
                        {visit.member.serviceAddress && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {visit.member.serviceAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 font-medium shrink-0">
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
                const cellBirthdays = getBirthdaysForDate(cellDate);

                cells.push(
                  <div
                    key={cellKey}
                    onClick={() => {
                      setCurrentDate(cellDate);
                      setView("day");
                    }}
                    className={`min-h-[100px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${isToday
                      ? "border-[#091329] bg-amber-50/20"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${isToday
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
                      {/* Informational Birthday Pill in Calendar Cell */}
                      {cellBirthdays.map((b) => (
                        <div
                          key={`month-bday-${b.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMode("birthdays");
                          }}
                          className="text-[10px] truncate px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200/80 font-medium flex items-center gap-1 hover:bg-amber-200 transition-colors"
                          title={`🎂 Birthday: ${b.fullName} (${b.memberId})`}
                        >
                          <Cake className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                          <span className="truncate">{b.fullName}</span>
                        </div>
                      ))}

                      {cellVisits.slice(0, 2).map((v) => (
                        <div
                          key={v.id}
                          className={`text-[10px] truncate px-1.5 py-0.5 rounded flex items-center justify-between gap-1 ${getMonthPillClasses(
                            v
                          )}`}
                        >
                          <span className="truncate">
                            {v.isEmergency && <span className="font-bold text-red-600 mr-1">SOS</span>}
                            {formatTimeIST(v.scheduledStart)} · {v.elder.firstName}
                          </span>
                          <VisitStatusIndicator status={v.status} size="xs" />
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
      </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CARE VISIT DETAILS MODAL                                         */}
      {/* ========================================================================= */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                selectedVisit.isEmergency ? "bg-red-950 border-b border-red-800" : "bg-[#091329]"
              }`}
            >
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  {selectedVisit.isEmergency ? (
                    <>
                      <Flame className="h-5 w-5 text-red-500 animate-pulse" /> Emergency Incident Assignment —{" "}
                      {selectedVisit.emergencyClassification?.replace("_", " ") || "CODE RED"}
                    </>
                  ) : (
                    <>
                      <CalendarDays className="h-5 w-5 text-[#B08A4A]" /> Care Visit Details
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  {selectedVisit.isEmergency
                    ? `Incident Number: ${selectedVisit.emergencyIncidentNumber || selectedVisit.id}`
                    : `Visit ID: ${selectedVisit.id}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm">
              {/* Badges bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {renderCategoryBadge(selectedVisit)}
                  {selectedVisit.isEmergency && selectedVisit.emergencyIncidentNumber && (
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                      {selectedVisit.emergencyIncidentNumber}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <VisitStatusIndicator status={selectedVisit.status} size="sm" />
                    {renderStatusBadge(selectedVisit.status)}
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Plan: <span className="font-semibold text-slate-800">{selectedVisit.carePlanName}</span>
                </span>
              </div>

              {/* Member & Elder Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedVisit.isEmergency ? "Caller / Patient" : "Care Recipient"}
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedVisit.elder.firstName} {selectedVisit.elder.lastName}
                  </p>
                  <p className="text-xs text-slate-500">Relationship: {selectedVisit.elder.relationship}</p>
                  {selectedVisit.elder.contactNumber && (
                    <p className="text-xs text-slate-600 mt-1 font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <a href={`tel:${selectedVisit.elder.contactNumber}`} className="hover:underline">
                        {selectedVisit.elder.contactNumber}
                      </a>
                    </p>
                  )}
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
                  {selectedVisit.member.mobileNumber && (
                    <p className="text-xs text-slate-600 mt-1 font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <a href={`tel:${selectedVisit.member.mobileNumber}`} className="hover:underline">
                        {selectedVisit.member.mobileNumber}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Timing & Recurrence */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule & Timing (IST)</p>
                  <div className="flex items-center gap-1.5">
                    {selectedVisit.occurrenceType === "ADHOC" || selectedVisit.category === "Ad-hoc" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        ADHOC VISIT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        RECURRING VISIT
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <CalendarIcon className="h-4 w-4 text-[#B08A4A]" />
                    {formatDateIST(selectedVisit.scheduledStart)}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {formatTimeIST(selectedVisit.scheduledStart)} – {formatTimeIST(selectedVisit.scheduledEnd)}
                  </div>
                </div>
                {selectedVisit.member.preferredScheduleDisplay && (
                  <div className="text-xs text-slate-600 pt-1.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1">
                    <span className="text-slate-500">Member Recurring Preference:</span>
                    <span className="font-semibold text-slate-800">{selectedVisit.member.preferredScheduleDisplay}</span>
                  </div>
                )}
                {selectedVisit.cancellationReason && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 mt-2">
                    <span className="font-bold">Cancellation Reason:</span> {selectedVisit.cancellationReason}
                  </div>
                )}
              </div>

              {/* Actual Execution & Employee Report */}
              {(selectedVisit.actualStart || selectedVisit.actualEnd || selectedVisit.workDescription || selectedVisit.status === "COMPLETED") && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Actual Execution & Employee Report
                    </p>
                    {selectedVisit.status === "COMPLETED" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-200/50 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Actual Arrival</span>
                      <span className="font-semibold text-slate-900">
                        {selectedVisit.actualStart ? formatTimeIST(selectedVisit.actualStart) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Actual Departure</span>
                      <span className="font-semibold text-slate-900">
                        {selectedVisit.actualEnd ? formatTimeIST(selectedVisit.actualEnd) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Actual Duration</span>
                      <span className="font-semibold text-slate-900">
                        {selectedVisit.actualDurationDisplay ||
                          (selectedVisit.actualStart && selectedVisit.actualEnd
                            ? (() => {
                                const start = new Date(selectedVisit.actualStart).getTime();
                                const end = new Date(selectedVisit.actualEnd).getTime();
                                const diff = end - start;
                                if (diff >= 0) {
                                  const totalMins = Math.round(diff / 60000);
                                  const hrs = Math.floor(totalMins / 60);
                                  const mins = totalMins % 60;
                                  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                }
                                return "Recorded";
                              })()
                            : selectedVisit.status === "COMPLETED"
                            ? "—"
                            : selectedVisit.actualStart
                            ? "In Progress"
                            : "—")}
                      </span>
                    </div>
                  </div>

                  {selectedVisit.workDescription && (
                    <div className="pt-2 border-t border-emerald-200/50">
                      <span className="text-slate-500 block text-[11px] font-semibold mb-1">Work Performed (Employee Report)</span>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedVisit.workDescription}
                      </div>
                    </div>
                  )}

                  {selectedVisit.completedAt && (
                    <div className="text-[11px] text-emerald-800/80 pt-1 flex items-center justify-between">
                      <span>Completed at: {formatDateIST(selectedVisit.completedAt)} · {formatTimeIST(selectedVisit.completedAt)}</span>
                      {selectedVisit.assignedEmployee && (
                        <span>By: {selectedVisit.assignedEmployee.firstName} {selectedVisit.assignedEmployee.lastName} ({selectedVisit.assignedEmployee.employeeId})</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Employee & Direct Calendar Assignment */}
              {(() => {
                const assignedPerson = selectedVisit.assignedEmployee || selectedVisit.assignedCaregiver;
                return (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Employee</p>
                      {renderAssignmentBadge(selectedVisit)}
                    </div>

                    {canManage && !selectedVisit.isEmergency ? (
                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] font-medium text-slate-600">
                          Directly allocate, change, or unassign employee:
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={directAssignEmpId}
                            onChange={(e) => setDirectAssignEmpId(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none"
                          >
                            <option value="">-- No Employee Assigned (Unassign) --</option>
                            {initialFormData.employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.displayName}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={directAssignLoading}
                            onClick={async () => {
                              setDirectAssignLoading(true);
                              setActionError(null);
                              const targetEmpId = directAssignEmpId || null;
                              const res = await assignCaregiverDirectly(selectedVisit.id, targetEmpId);
                              setDirectAssignLoading(false);
                              if (res.success) {
                                setDirectAssignSuccess(true);
                                const assignedEmp = initialFormData.employees.find((e) => e.id === targetEmpId);
                                setSelectedVisit((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        assignedEmployee: assignedEmp
                                          ? {
                                              id: assignedEmp.id,
                                              employeeId: assignedEmp.employeeId,
                                              firstName: assignedEmp.firstName,
                                              lastName: assignedEmp.lastName,
                                              designation: assignedEmp.designation,
                                              contactNumber: null,
                                            }
                                          : null,
                                        assignedCaregiver: assignedEmp
                                          ? {
                                              id: assignedEmp.id,
                                              employeeId: assignedEmp.employeeId,
                                              firstName: assignedEmp.firstName,
                                              lastName: assignedEmp.lastName,
                                              designation: assignedEmp.designation,
                                              contactNumber: null,
                                            }
                                          : null,
                                      }
                                    : null
                                );
                                refreshVisits();
                                setTimeout(() => setDirectAssignSuccess(false), 3000);
                              } else {
                                setActionError(res.error || "Failed to update employee assignment.");
                              }
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#091329] hover:bg-[#162850] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {directAssignLoading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : directAssignSuccess ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            ) : null}
                            <span>{directAssignSuccess ? "Assigned!" : "Save"}</span>
                          </button>
                        </div>
                        {directAssignSuccess && (
                          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Employee assignment updated successfully.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        {assignedPerson ? (
                          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {assignedPerson.firstName} {assignedPerson.lastName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {assignedPerson.designation} · ID: {assignedPerson.employeeId}
                              </p>
                            </div>
                            {assignedPerson.contactNumber && (
                              <a
                                href={`tel:${assignedPerson.contactNumber}`}
                                className="text-xs font-mono text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded inline-flex items-center gap-1 transition-colors"
                              >
                                <Phone className="h-3 w-3 text-slate-400" />
                                {assignedPerson.contactNumber}
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-700 font-semibold pt-1">No employee currently assigned.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Address */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {selectedVisit.isEmergency ? "Incident Location / Address" : "Service Address"}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed pt-1 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedVisit.member.serviceAddress || "Address not specified on profile."}</span>
                </p>
              </div>

              {/* Operational Notes */}
              {selectedVisit.operationalNotes && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedVisit.isEmergency ? "Dispatch & Emergency Notes" : "Operational Notes"}
                  </p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedVisit.operationalNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectedVisit.isEmergency && selectedVisit.emergencyIncidentId && (
                  <Link
                    href={`/emergencyos/incidents/${selectedVisit.emergencyIncidentId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Flame className="h-3.5 w-3.5 text-amber-300" /> Open in EmergencyOS Console
                  </Link>
                )}
                {selectedVisit.member.userId ? (
                  <Link
                    href={`/admin/members/${selectedVisit.member.userId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#091329] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Member Details
                  </Link>
                ) : null}
              </div>

              {!selectedVisit.isEmergency && canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Change Status
                  </button>
                  <button
                    onClick={() => {
                      setRescheduleDate(formatDateKey(selectedVisit.scheduledStart));
                      setRescheduleStartTime(formatTimeInputIST(selectedVisit.scheduledStart));
                      setRescheduleEndTime(formatTimeInputIST(selectedVisit.scheduledEnd));
                      setRescheduleAssignedEmp(selectedVisit.assignedEmployee?.id || selectedVisit.assignedCaregiver?.id || "");
                      setActionError(null);
                      setShowRescheduleModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => {
                      setEditDate(formatDateKey(selectedVisit.scheduledStart));
                      setEditStartTime(formatTimeInputIST(selectedVisit.scheduledStart));
                      setEditEndTime(formatTimeInputIST(selectedVisit.scheduledEnd));
                      setEditAssignedEmp(selectedVisit.assignedEmployee?.id || selectedVisit.assignedCaregiver?.id || "");
                      setActionError(null);
                      setShowEditModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Edit Visit
                  </button>
                  {selectedVisit.status !== "CANCELLED" && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
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
      {/* MODAL 2: SCHEDULE ADHOC VISIT MODAL                                       */}
      {/* ========================================================================= */}
      {showScheduleModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl relative">
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[#B08A4A]" /> Schedule Adhoc Visit
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Schedule an ad-hoc visit outside the recurring plan or as a replacement for a cancelled visit.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setReplacementOriginalVisitId("");
                }}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                setActionError(null);
                const fd = new FormData(e.currentTarget);
                const selectedCaseId = (fd.get("caseSelectionId") as string) || scheduleCaseSelectionId;
                if (!selectedCaseId) {
                  setActionError("Please select a Member / Care Recipient.");
                  setActionLoading(false);
                  return;
                }
                const res = await createScheduleVisit({
                  caseSelectionId: selectedCaseId,
                  date: scheduleDate,
                  startTime: scheduleStartTime,
                  endTime: scheduleEndTime,
                  assignedEmpId: (fd.get("assignedEmpId") as string) || undefined,
                  category: (fd.get("category") as any) || "Ad-hoc",
                  occurrenceType: "ADHOC",
                  originalVisitId: replacementOriginalVisitId || undefined,
                  status: (fd.get("status") as string) || "SCHEDULED",
                  operationalNotes: fd.get("notes") as string,
                });
                setActionLoading(false);
                if (res.success) {
                  setShowScheduleModal(false);
                  setReplacementOriginalVisitId("");
                  refreshVisits();
                } else {
                  setActionError(res.error || "Failed to schedule adhoc visit.");
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <SearchableMemberSelect
                name="caseSelectionId"
                value={scheduleCaseSelectionId}
                onChange={(m) => {
                  setScheduleCaseSelectionId(m?.id || "");
                  setReplacementOriginalVisitId("");
                }}
                initialCases={initialFormData.cases}
                required
              />

              {/* Optional Replacement for Cancelled Visit */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Replacement for Cancelled Visit <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <select
                  value={replacementOriginalVisitId}
                  onChange={(e) => setReplacementOriginalVisitId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="">-- None (New standalone adhoc visit) --</option>
                  {caseCancelledVisits.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.displayLabel}
                    </option>
                  ))}
                </select>
                {replacementOriginalVisitId ? (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 inline text-amber-600" /> This adhoc visit will be linked as a replacement for the selected cancelled occurrence.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Select a previous cancelled visit if this visit is compensating for it.
                  </p>
                )}
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
                  <select name="category" defaultValue="Ad-hoc" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
                    <option value="Ad-hoc">Ad-hoc (Additional)</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select name="status" defaultValue="SCHEDULED" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="WAITLISTED">Waitlisted</option>
                  </select>
                </div>
              </div>

              <SearchableEmployeeSelect
                name="assignedEmpId"
                value={scheduleAssignedEmp}
                onChange={(empId) => setScheduleAssignedEmp(empId)}
                date={scheduleDate}
                startTime={scheduleStartTime}
                endTime={scheduleEndTime}
                initialEmployees={initialFormData.employees}
                allowUnassigned
              />

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Notes / Reason</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Reason for ad-hoc visit, special instructions, or medical notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setReplacementOriginalVisitId("");
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    !scheduleCaseSelectionId ||
                    Boolean(
                      scheduleAssignedEmp &&
                      scheduleEmpAvailability.find((a) => a.employeeId === scheduleAssignedEmp)?.available === false
                    )
                  }
                  className="px-5 py-2 bg-[#091329] text-white font-semibold rounded-lg hover:bg-[#162850] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? "Scheduling..." : "Create Adhoc Visit"}
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
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl relative">
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between rounded-t-2xl">
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
                if (rescheduleEndTime <= rescheduleStartTime) {
                  setActionError("Invalid reschedule time range. End time must be after start time.");
                  return;
                }
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
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedVisit.member?.name || `${selectedVisit.elder.firstName} ${selectedVisit.elder.lastName}`}
                  </span>
                  {selectedVisit.member?.memberId && (
                    <span className="font-mono text-[10px] bg-[#091329] text-white px-2 py-0.5 rounded font-semibold tracking-wider">
                      {selectedVisit.member.memberId}
                    </span>
                  )}
                  {selectedVisit.elder &&
                    selectedVisit.elder.firstName &&
                    selectedVisit.elder.firstName.toLowerCase() !==
                      (selectedVisit.member?.name || "").toLowerCase().split(" ")[0] && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        (Elder: {selectedVisit.elder.firstName} {selectedVisit.elder.lastName})
                      </span>
                    )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#091329] bg-[#B08A4A]/10 px-2 py-0.5 rounded border border-[#B08A4A]/30">
                    <ShieldCheck className="h-3 w-3 text-[#B08A4A] shrink-0" />
                    {selectedVisit.carePlanName || "No service plan recorded"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                    {selectedVisit.member?.mobileNumber || "Not available"}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate" title={selectedVisit.member?.serviceAddress || selectedVisit.elder?.address || "Not available"}>
                    {selectedVisit.member?.serviceAddress || selectedVisit.elder?.address || "Not available"}
                  </span>
                </div>

                {/* Preferred Care Visit Schedule Banner/Badge */}
                {selectedVisit.member?.preferredScheduleDisplay && selectedVisit.member.preferredScheduleDisplay !== "—" ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 rounded-md mt-1 w-fit">
                    <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>
                      Preferred Schedule: <strong className="font-semibold">{selectedVisit.member.preferredScheduleDisplay}</strong>
                    </span>
                    <span className="text-indigo-500 font-normal text-[10px]">(Recurring preference)</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>No preferred visit schedule set</span>
                  </div>
                )}
              </div>

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

              <SearchableEmployeeSelect
                name="assignedEmpId"
                value={rescheduleAssignedEmp}
                onChange={(empId) => setRescheduleAssignedEmp(empId)}
                date={rescheduleDate}
                startTime={rescheduleStartTime}
                endTime={rescheduleEndTime}
                excludeVisitId={selectedVisit.id}
                initialEmployees={initialFormData.employees}
                allowUnassigned
              />

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
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl relative">
            <div className="px-6 py-4 bg-[#091329] text-white flex items-center justify-between rounded-t-2xl">
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
                  caseSelectionId: (fd.get("caseSelectionId") as string) || editCaseSelectionId,
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
              <SearchableMemberSelect
                name="caseSelectionId"
                value={editCaseSelectionId}
                onChange={(m) => setEditCaseSelectionId(m?.id || "")}
                initialCases={initialFormData.cases}
                label="Member / Care Recipient"
                required
              />
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

              <SearchableEmployeeSelect
                name="assignedEmpId"
                value={editAssignedEmp}
                onChange={(empId) => setEditAssignedEmp(empId)}
                date={editDate}
                startTime={editStartTime}
                endTime={editEndTime}
                excludeVisitId={selectedVisit.id}
                initialEmployees={initialFormData.employees}
                allowUnassigned
              />

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
