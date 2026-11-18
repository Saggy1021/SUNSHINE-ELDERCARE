"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BirthdayCalendarPayload,
  BirthdayEntry,
  BirthdayCalendarService,
} from "@/lib/services/birthday-calendar";
import {
  Cake,
  Calendar,
  CalendarDays,
  Search,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Heart,
  Clock,
  AlertCircle,
  Filter,
  X,
  Gift,
} from "lucide-react";

export type BirthdaySubView = "today" | "upcoming" | "month" | "year";

interface BirthdayCalendarViewProps {
  initialData: BirthdayCalendarPayload;
  onSwitchToVisits?: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function BirthdayCalendarView({
  initialData,
  onSwitchToVisits,
}: BirthdayCalendarViewProps) {
  const [activeSubView, setActiveSubView] = useState<BirthdaySubView>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    initialData.referenceMonth
  ); // 1 - 12
  const [selectedYear, setSelectedYear] = useState<number>(
    initialData.referenceYear
  );

  // Filter entries in real-time based on search query
  const filteredEntries = useMemo(() => {
    return BirthdayCalendarService.filterBirthdayEntries(
      initialData.allBirthdays,
      searchQuery
    );
  }, [initialData.allBirthdays, searchQuery]);

  // Today's birthdays (matching search)
  const todayBirthdays = useMemo(() => {
    return filteredEntries.filter((b) => b.isToday);
  }, [filteredEntries]);

  // Upcoming birthdays (sorted chronologically)
  const upcomingBirthdays = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) {
        return a.daysUntil - b.daysUntil;
      }
      return a.fullName.localeCompare(b.fullName);
    });
  }, [filteredEntries]);

  // Month birthdays for the currently viewed month
  const monthBirthdays = useMemo(() => {
    return BirthdayCalendarService.getBirthdaysForMonth(
      filteredEntries,
      selectedMonth
    );
  }, [filteredEntries, selectedMonth]);

  // 12-month overview for Full Year view
  const yearCalendarData = useMemo(() => {
    return BirthdayCalendarService.getYearCalendarData(filteredEntries);
  }, [filteredEntries]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(initialData.referenceMonth);
    setSelectedYear(initialData.referenceYear);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Confirmed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-[#1A365D]">
            <Cake className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {initialData.stats.totalConfirmedMembersWithDob}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Confirmed Birthdays
            </div>
          </div>
        </div>

        {/* Today's Birthdays */}
        <div
          onClick={() => setActiveSubView("today")}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center gap-3 ${
            initialData.stats.todayCount > 0
              ? "bg-amber-50/70 border-amber-200 ring-2 ring-amber-400/40"
              : "bg-white border-slate-200/90 hover:border-slate-300"
          }`}
        >
          <div
            className={`p-2.5 rounded-lg ${
              initialData.stats.todayCount > 0
                ? "bg-amber-500 text-white animate-pulse"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
              {initialData.stats.todayCount}
              {initialData.stats.todayCount > 0 && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-white">
                  Today
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Today's Birthdays
            </div>
          </div>
        </div>

        {/* This Month */}
        <div
          onClick={() => {
            setActiveSubView("month");
            handleResetToCurrentMonth();
          }}
          className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer shadow-xs flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {initialData.stats.thisMonthCount}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              In {MONTH_NAMES[initialData.referenceMonth - 1]}
            </div>
          </div>
        </div>

        {/* Upcoming 30 Days */}
        <div
          onClick={() => setActiveSubView("upcoming")}
          className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer shadow-xs flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {initialData.stats.upcoming30DaysCount}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Next 30 Days
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Subview Tabs & Real-time Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Four Dedicated Subviews */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto self-start md:self-auto">
          <button
            onClick={() => setActiveSubView("today")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubView === "today"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Today's Birthdays
            {todayBirthdays.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {todayBirthdays.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubView("upcoming")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubView === "upcoming"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            Upcoming Birthdays
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
              {upcomingBirthdays.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubView("month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubView === "month"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            This Month
          </button>

          <button
            onClick={() => setActiveSubView("year")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubView === "year"
                ? "bg-white text-[#091329] shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
            Full Year Calendar
          </button>
        </div>

        {/* Real-time Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member, Member ID, spouse, employee..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#091329]/15 focus:border-[#091329]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBVIEW 1: TODAY'S BIRTHDAYS                                              */}
      {/* ========================================================================= */}
      {activeSubView === "today" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Today's Birthdays (
              {new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(initialData.referenceDate))}
              )
            </h2>
            <span className="text-xs text-slate-500">
              {todayBirthdays.length} celebrating today
            </span>
          </div>

          {todayBirthdays.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                No Birthdays Today
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No confirmed members, spouses, or employees have birthdays on{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "long",
                }).format(new Date(initialData.referenceDate))}
                .
              </p>
              {upcomingBirthdays.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setActiveSubView("upcoming")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#091329] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Next Upcoming: {upcomingBirthdays[0].fullName} in{" "}
                    {upcomingBirthdays[0].daysUntil} days ({upcomingBirthdays[0].formattedBirthday}) →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayBirthdays.map((entry) => (
                <BirthdayCard key={entry.id} entry={entry} isCelebrationToday />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 2: UPCOMING BIRTHDAYS                                             */}
      {/* ========================================================================= */}
      {activeSubView === "upcoming" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                Chronological Upcoming Birthdays
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Next annual occurrences in chronological sequence, crossing into the next calendar year.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {upcomingBirthdays.length} confirmed member, spouse & employee birthdays
            </span>
          </div>

          {upcomingBirthdays.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">
              No birthdays found matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBirthdays.map((entry) => (
                <BirthdayCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 3: THIS MONTH (WITH MONTH NAVIGATION)                            */}
      {/* ========================================================================= */}
      {activeSubView === "month" && (
        <div className="space-y-4">
          {/* Month Navigation Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-bold text-[#091329] tracking-tight px-2">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Jump to Current Month */}
              <button
                onClick={handleResetToCurrentMonth}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Current Month ({MONTH_NAMES[initialData.referenceMonth - 1]})
              </button>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {monthBirthdays.length} birthday{monthBirthdays.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {monthBirthdays.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">
              No birthdays in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              {searchQuery ? ` matching "${searchQuery}"` : ""}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthBirthdays.map((entry) => (
                <BirthdayCard key={entry.id} entry={entry} showMonthSpecificDay />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 4: FULL YEAR CALENDAR (12 MONTHS OVERVIEW)                        */}
      {/* ========================================================================= */}
      {activeSubView === "year" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Full Year Birthday Calendar ({selectedYear})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Annual 12-month overview of all registered member and spouse birthdays.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {yearCalendarData.map((m) => {
              const isCurrent = m.month === initialData.referenceMonth;
              return (
                <div
                  key={m.month}
                  className={`bg-white rounded-xl border transition-all p-4 space-y-3 ${
                    isCurrent
                      ? "border-[#1A365D] ring-2 ring-[#1A365D]/15 shadow-sm"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {m.monthName}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#1A365D] text-white">
                          Current
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        m.count > 0
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {m.count}
                    </span>
                  </div>

                  {m.birthdays.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2">
                      No birthdays
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {m.birthdays.map((b) => (
                        <li
                          key={b.id}
                          className="p-2 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-100 flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                              <span>{b.fullName}</span>
                              {b.personType === "EMPLOYEE" && (
                                <span className="text-[10px] text-teal-800 bg-teal-50 px-1 rounded font-normal border border-teal-200">
                                  Employee
                                </span>
                              )}
                              {b.personType === "SPOUSE" && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded font-normal">
                                  Spouse
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                {b.employeeId || b.memberId}
                              </span>
                              {b.turningAge && (
                                <span>• Age {b.turningAge}</span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                            {b.birthDay}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Card component for individual Birthday entries.
 */
function BirthdayCard({
  entry,
  isCelebrationToday = false,
  showMonthSpecificDay = false,
}: {
  entry: BirthdayEntry;
  isCelebrationToday?: boolean;
  showMonthSpecificDay?: boolean;
}) {
  const isSpouse = entry.personType === "SPOUSE";
  const isEmployee = entry.personType === "EMPLOYEE";

  return (
    <div
      className={`rounded-xl border transition-all p-4 space-y-3.5 relative overflow-hidden ${
        isCelebrationToday || entry.isToday
          ? "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border-amber-300 shadow-md ring-2 ring-amber-400/30"
          : "bg-white border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300"
      }`}
    >
      {/* Top Header: Person Badge + ID + Countdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
              isEmployee
                ? "bg-teal-100 text-teal-900 border border-teal-200"
                : isSpouse
                ? "bg-amber-100 text-amber-900 border border-amber-200"
                : "bg-blue-100 text-[#1A365D] border border-blue-200"
            }`}
          >
            {isEmployee ? "Employee" : isSpouse ? "Spouse" : "Primary Member"}
          </span>

          {entry.employeeId && (
            <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              {entry.employeeId}
            </span>
          )}

          {entry.memberId && (
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {entry.memberId}
            </span>
          )}
        </div>

        {/* Days Until Countdown Pill */}
        <div>
          {entry.isToday ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-amber-500 px-2.5 py-0.5 rounded-full shadow-xs animate-bounce">
              <Sparkles className="h-3 w-3" /> Today!
            </span>
          ) : entry.daysUntil <= 30 ? (
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
              In {entry.daysUntil} day{entry.daysUntil === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              In {entry.daysUntil} days
            </span>
          )}
        </div>
      </div>

      {/* Main Name & Spouse Context */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <span>{entry.fullName}</span>
        </h3>

        {/* If Spouse: display clear linkage to Primary Member */}
        {isSpouse && entry.primaryMemberName && (
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-500 shrink-0" />
            <span>
              Spouse of{" "}
              <strong className="text-slate-700 font-semibold">
                {entry.primaryMemberName}
              </strong>
            </span>
          </p>
        )}
      </div>

      {/* Birthday Details Box */}
      <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Cake className="h-3.5 w-3.5 text-amber-600" /> Birthday:
          </span>
          <span className="font-bold text-slate-900">
            {entry.formattedBirthday}
            {entry.turningAge !== null && (
              <span className="font-normal text-slate-500 ml-1">
                (Age {entry.turningAge})
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Next Occurrence:
          </span>
          <span className="font-medium text-slate-700">
            {entry.nextOccurrenceFormatted}
          </span>
        </div>

        {/* Leap Day Indicator */}
        {entry.isLeapDay && entry.leapDayNote && (
          <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded p-1.5 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-amber-600" />
            <span>{entry.leapDayNote}</span>
          </div>
        )}
      </div>

      {/* Contact & Actions Footer */}
      {isEmployee ? (
        <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50/70 px-2 py-0.5 rounded border border-teal-100 font-medium">
            Sunshine Staff
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Internal Record</span>
        </div>
      ) : (
        <div className="pt-1 flex items-center justify-between gap-2">
          {/* Phone / WhatsApp Quick Links */}
          <div className="flex items-center gap-1.5">
            {entry.personMobile ? (
              <>
                <a
                  href={`tel:${entry.personMobile}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                  title={`Call ${entry.personMobile}`}
                >
                  <Phone className="h-3 w-3 text-emerald-600" />
                  <span className="font-mono text-[10px]">{entry.personMobile}</span>
                </a>

                <a
                  href={`https://wa.me/91${entry.personMobile.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200 transition-colors"
                  title="Send WhatsApp Greeting"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                No mobile recorded
              </span>
            )}
          </div>

          {/* View Member Profile */}
          {entry.userId && (
            <Link
              href={`/admin/members/${entry.userId}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A365D] hover:text-[#091329] hover:underline"
            >
              <span>Member Profile</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
