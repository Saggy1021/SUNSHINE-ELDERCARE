"use client";

import React from "react";
import {
  PREFERRED_VISIT_DAYS,
  normalize12HourTime,
  to24HourTime,
} from "@/lib/services/preferred-schedule";
import { Calendar, Clock, CheckCircle2, Circle, Repeat } from "lucide-react";

interface RecurringCareScheduleSelectorProps {
  frequency: "WEEKLY" | "FORTNIGHTLY";
  onFrequencyChange: (val: "WEEKLY" | "FORTNIGHTLY") => void;
  fortnightlyPattern: "WEEK_1_3" | "WEEK_2_4";
  onPatternChange: (val: "WEEK_1_3" | "WEEK_2_4") => void;
  preferredDay: string;
  onDayChange: (val: string) => void;
  preferredTime: string; // 24-hr "HH:mm"
  onTimeChange: (val: string) => void;
  readOnly?: boolean;
}

export default function RecurringCareScheduleSelector({
  frequency,
  onFrequencyChange,
  fortnightlyPattern,
  onPatternChange,
  preferredDay,
  onDayChange,
  preferredTime,
  onTimeChange,
  readOnly = false,
}: RecurringCareScheduleSelectorProps) {
  const normalized12 = normalize12HourTime(preferredTime);

  return (
    <div className="space-y-4">
      {/* Hidden inputs ensure standard HTML / FormData submission captures all fields */}
      <input type="hidden" name="preferredVisitFrequency" value={frequency} />
      <input
        type="hidden"
        name="preferredVisitFortnightlyPattern"
        value={frequency === "FORTNIGHTLY" ? fortnightlyPattern : ""}
      />

      {/* FREQUENCY SELECTOR */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Visit Frequency
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option A: Weekly */}
          <div
            onClick={() => !readOnly && onFrequencyChange("WEEKLY")}
            className={`cursor-pointer rounded-xl border p-3.5 transition-all flex items-start gap-3 ${
              frequency === "WEEKLY"
                ? "border-[#091329] bg-slate-900/5 ring-1 ring-[#091329]"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="mt-0.5">
              {frequency === "WEEKLY" ? (
                <CheckCircle2 className="h-5 w-5 text-[#091329]" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">Weekly</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Visit every week on the selected weekday and time.
              </p>
            </div>
          </div>

          {/* Option B: Fortnightly */}
          <div
            onClick={() => !readOnly && onFrequencyChange("FORTNIGHTLY")}
            className={`cursor-pointer rounded-xl border p-3.5 transition-all flex items-start gap-3 ${
              frequency === "FORTNIGHTLY"
                ? "border-[#091329] bg-slate-900/5 ring-1 ring-[#091329]"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="mt-0.5">
              {frequency === "FORTNIGHTLY" ? (
                <CheckCircle2 className="h-5 w-5 text-[#091329]" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">Fortnightly</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Visits twice a month on selected calendar week occurrences.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FORTNIGHTLY SUB-OPTIONS */}
      {frequency === "FORTNIGHTLY" && (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-amber-700" />
            <label className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Select Fortnightly Recurrence Pattern
            </label>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Choose which 2 weeks of the calendar month the visits occur. In months with 5 occurrences, the 5th occurrence is strictly skipped.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div
              onClick={() => !readOnly && onPatternChange("WEEK_1_3")}
              className={`cursor-pointer rounded-lg border p-3 transition-all flex items-center gap-2.5 ${
                fortnightlyPattern === "WEEK_1_3"
                  ? "border-amber-700 bg-white shadow-2xs font-semibold text-slate-900"
                  : "border-amber-200 bg-amber-50/50 hover:bg-white text-slate-700"
              }`}
            >
              {fortnightlyPattern === "WEEK_1_3" ? (
                <CheckCircle2 className="h-4 w-4 text-amber-700 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <span className="text-xs">Week 1 and Week 3 (1st &amp; 3rd occurrences)</span>
            </div>

            <div
              onClick={() => !readOnly && onPatternChange("WEEK_2_4")}
              className={`cursor-pointer rounded-lg border p-3 transition-all flex items-center gap-2.5 ${
                fortnightlyPattern === "WEEK_2_4"
                  ? "border-amber-700 bg-white shadow-2xs font-semibold text-slate-900"
                  : "border-amber-200 bg-amber-50/50 hover:bg-white text-slate-700"
              }`}
            >
              {fortnightlyPattern === "WEEK_2_4" ? (
                <CheckCircle2 className="h-4 w-4 text-amber-700 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <span className="text-xs">Week 2 and Week 4 (2nd &amp; 4th occurrences)</span>
            </div>
          </div>
        </div>
      )}

      {/* WEEKDAY AND TIME FIELDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Preferred Visit Day
          </label>
          <select
            name="preferredVisitDay"
            value={preferredDay}
            disabled={readOnly}
            onChange={(e) => onDayChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none transition-colors"
          >
            <option value="">No preference / Not specified</option>
            {PREFERRED_VISIT_DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Preferred Visit Time (IST)
          </label>
          <input
            type="time"
            name="preferredVisitTime"
            value={preferredTime}
            disabled={readOnly}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-[#091329] focus:ring-1 focus:ring-[#091329] outline-none transition-colors"
          />
          {preferredTime && (
            <p className="text-xs text-indigo-700 font-semibold mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-indigo-600" />
              12-Hour Display: {normalized12} (IST)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
