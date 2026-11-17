import React from "react";
import { Receipt } from "lucide-react";

export default function PaymentsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading Payments">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#091329]" />
            <div className="h-7 w-36 bg-slate-200 rounded-md" />
          </div>
          <div className="h-4 w-72 bg-slate-100 rounded mt-1.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="h-9 w-64 bg-slate-200 rounded-lg mb-4" />
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div className="space-y-1">
              <div className="h-4 w-44 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-5 w-24 bg-slate-200 rounded" />
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
