import React from "react";
import { Users } from "lucide-react";

export default function EmployeesLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading Employees">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-[#091329]" />
            <div className="h-7 w-64 bg-slate-200 rounded-md" />
          </div>
          <div className="h-4 w-96 bg-slate-100 rounded mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-slate-200 rounded-lg" />
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
        <div className="h-8 w-28 bg-slate-200 rounded-md" />
        <div className="h-8 w-36 bg-slate-100 rounded-md" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="h-9 w-64 bg-slate-200 rounded-lg" />
          <div className="h-8 w-24 bg-slate-100 rounded-md" />
        </div>

        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-6 w-16 bg-emerald-50 rounded-full" />
              <div className="h-8 w-16 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
