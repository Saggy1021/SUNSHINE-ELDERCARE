"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

export function AuditLogSearch({
  initialAction,
  initialEntityType,
}: {
  initialAction?: string;
  initialEntityType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [action, setAction] = useState(initialAction ?? "");
  const [entityType, setEntityType] = useState(initialEntityType ?? "");

  const push = useCallback(
    (act: string, ent: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page"); // Reset page on new search
      if (act) params.set("action", act);
      else params.delete("action");

      if (ent) params.set("entityType", ent);
      else params.delete("entityType");

      router.push(`/admin/audit-log?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    push(action.trim(), entityType.trim());
  };

  const handleClear = () => {
    setAction("");
    setEntityType("");
    push("", "");
  };

  const hasFilter = !!(initialAction || initialEntityType);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Action</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="e.g. USER_CREATED"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Entity Type</label>
        <input
          type="text"
          placeholder="e.g. USER"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-slate-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Search
        </button>
        {hasFilter && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-slate-500 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>
    </form>
  );
}
