import React from "react";
import { CalendarDays } from "lucide-react";

export default function ScheduleLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading Visit Schedule">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#091329]" />
            <div className="h-7 w-44 bg-slate-200 rounded-md" />
          </div>
          <div className="h-4 w-72 bg-slate-100 rounded mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="h-9 bg-slate-100 rounded-lg" />
          <div className="h-9 bg-slate-100 rounded-lg" />
          <div className="h-9 bg-slate-100 rounded-lg" />
          <div className="h-9 bg-slate-100 rounded-lg" />
        </div>
      </div>

      {/* Calendar Grid Skeleton (7-Day Column Layout) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="h-8 w-48 bg-slate-200 rounded-md" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            <div className="h-8 w-8 bg-slate-200 rounded-lg" />
            <div className="h-8 w-8 bg-slate-200 rounded-lg" />
          </div>
        </div>

        {/* Multi-Day Columns */}
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[450px]">
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <div key={col} className="p-3 space-y-3">
              <div className="h-5 w-16 bg-slate-200 rounded mx-auto" />
              <div className="h-4 w-12 bg-slate-100 rounded mx-auto" />
              <div className="space-y-2 pt-2">
                <div className="h-20 bg-slate-50 border border-slate-200 rounded-lg p-2" />
                {col % 2 === 0 && (
                  <div className="h-20 bg-slate-50 border border-slate-200 rounded-lg p-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
