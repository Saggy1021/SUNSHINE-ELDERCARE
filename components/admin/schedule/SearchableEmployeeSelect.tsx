"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  searchScheduleEmployees,
  ScheduleEmployeeSearchResult,
} from "@/app/actions/care-schedule";
import {
  Search,
  Check,
  X,
  User,
  UserX,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from "lucide-react";

export interface SearchableEmployeeSelectProps {
  name?: string; // Form input name, default: "assignedEmpId"
  value?: string; // Currently selected employee ID (cuid) or ""
  onChange?: (
    employeeId: string,
    employee?: ScheduleEmployeeSearchResult | null
  ) => void;
  date: string; // YYYY-MM-DD (IST)
  startTime: string; // HH:mm (IST)
  endTime: string; // HH:mm (IST)
  excludeVisitId?: string;
  initialEmployees?: Array<any>;
  allowUnassigned?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function SearchableEmployeeSelect({
  name = "assignedEmpId",
  value = "",
  onChange,
  date,
  startTime,
  endTime,
  excludeVisitId,
  initialEmployees = [],
  allowUnassigned = true,
  disabled = false,
  label = "Assign Employee",
  className = "",
}: SearchableEmployeeSelectProps) {
  const [selectedEmp, setSelectedEmp] =
    useState<ScheduleEmployeeSearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScheduleEmployeeSearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRequestId = useRef(0);
  const empCacheRef = useRef<Map<string, ScheduleEmployeeSearchResult[]>>(new Map());

  // Sync initial selection from props or initialEmployees
  useEffect(() => {
    if (!value) {
      setSelectedEmp(null);
      return;
    }

    if (selectedEmp && selectedEmp.id === value) {
      return;
    }

    const match = initialEmployees.find((e) => e.id === value);
    if (match) {
      const normalized: ScheduleEmployeeSearchResult = {
        id: match.id,
        employeeId: match.employeeId || "",
        name:
          match.name ||
          `${match.firstName || ""} ${match.lastName || ""}`.trim() ||
          match.displayName ||
          "Employee",
        firstName: match.firstName || "",
        lastName: match.lastName || "",
        designation: match.designation || "",
        department: match.department || null,
        status: match.status || "ACTIVE",
        available: true,
      };
      setSelectedEmp(normalized);
    }
  }, [value, initialEmployees]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recalculate search results & availability with immediate caching and 150ms debounce
  useEffect(() => {
    if (!isOpen && !value) return;

    const trimmed = query.trim();
    const cacheKey = `${trimmed.toLowerCase()}|${date}|${startTime}|${endTime}|${excludeVisitId || ""}`;

    // Instant cache hit: display immediately with 0ms network latency
    if (empCacheRef.current.has(cacheKey)) {
      const cached = empCacheRef.current.get(cacheKey)!;
      setResults(cached);
      setIsSearching(false);

      if (value) {
        const currentInResults = cached.find((e) => e.id === value);
        if (currentInResults) {
          setSelectedEmp((prev) =>
            prev
              ? {
                  ...prev,
                  available: currentInResults.available,
                  conflictTime: currentInResults.conflictTime,
                  conflictReason: currentInResults.conflictReason,
                }
              : currentInResults
          );
        }
      }
      return;
    }

    setIsSearching(true);
    const thisRequestId = ++searchRequestId.current;

    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const data = await searchScheduleEmployees({
            query: trimmed,
            date,
            startTime,
            endTime,
            excludeVisitId,
          });

          // Cache recent results safely (cap at 100 entries)
          if (empCacheRef.current.size >= 100) {
            const oldest = empCacheRef.current.keys().next().value;
            if (oldest) empCacheRef.current.delete(oldest);
          }
          empCacheRef.current.set(cacheKey, data);

          if (thisRequestId === searchRequestId.current) {
            setResults(data);
            setIsSearching(false);

            // If an employee is currently selected, update their availability badge
            if (value) {
              const currentInResults = data.find((e) => e.id === value);
              if (currentInResults) {
                setSelectedEmp((prev) =>
                  prev
                    ? {
                        ...prev,
                        available: currentInResults.available,
                        conflictTime: currentInResults.conflictTime,
                        conflictReason: currentInResults.conflictReason,
                      }
                    : currentInResults
                );
              }
            }
          }
        } catch (err) {
          if (thisRequestId === searchRequestId.current) {
            setResults([]);
            setIsSearching(false);
          }
        }
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [query, date, startTime, endTime, excludeVisitId, isOpen, value]);

  // Auto-scroll highlighted list item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      const activeItem = items[highlightedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (emp: ScheduleEmployeeSearchResult | null) => {
    if (emp && !emp.available) {
      return; // Prevent selecting occupied or unavailable employees
    }

    setSelectedEmp(emp);
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);

    if (onChange) {
      onChange(emp ? emp.id : "", emp);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleSelect(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    const selectableCount = results.length + (allowUnassigned ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < selectableCount - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : selectableCount - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allowUnassigned && highlightedIndex === 0) {
        handleSelect(null);
      } else {
        const resultIdx = allowUnassigned
          ? highlightedIndex - 1
          : highlightedIndex;
        if (resultIdx >= 0 && results[resultIdx]) {
          const item = results[resultIdx];
          if (item.available) {
            handleSelect(item);
          }
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block font-semibold text-slate-700">{label}</label>
          {isSearching && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking availability...
            </span>
          )}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selectedEmp?.id || ""} />

      {/* Collapsed State */}
      {!isOpen ? (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`p-2.5 bg-white border rounded-xl hover:border-slate-400 cursor-pointer transition-all ${
            selectedEmp && !selectedEmp.available
              ? "border-amber-400 bg-amber-50/30"
              : "border-slate-300"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-between gap-2">
            {selectedEmp ? (
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedEmp.name}
                  </span>
                  {selectedEmp.employeeId && (
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-semibold tracking-wider">
                      {selectedEmp.employeeId}
                    </span>
                  )}
                  {selectedEmp.designation && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      • {selectedEmp.designation}
                    </span>
                  )}
                  {selectedEmp.department && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({selectedEmp.department})
                    </span>
                  )}
                </div>

                {/* Availability Badge */}
                <div className="flex items-center gap-2">
                  {selectedEmp.available ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                      <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
                      {selectedEmp.conflictReason || "Occupied (Overlapping appointment)"}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-600 py-0.5">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-xs">Leave Unassigned</span>
              </div>
            )}

            {!disabled && (
              <div className="flex items-center gap-1 shrink-0">
                {selectedEmp ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Clear assignment"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Search Input Box */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Search employee by name, ID (e.g. SEC184), designation..."
              className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/20 focus:border-[#091329] transition-all"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 h-3.5 w-3.5 text-slate-400 animate-spin" />
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Conflicting selection warning */}
      {selectedEmp && !selectedEmp.available && !isOpen && (
        <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          The selected employee is occupied during this time window. Please choose an available employee.
        </p>
      )}

      {/* Autocomplete Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {isSearching
                ? "Checking real-time availability..."
                : `${results.length} active employee${results.length === 1 ? "" : "s"}`}
            </span>
            <span className="text-[10px] text-slate-400">
              Only available employees can be selected
            </span>
          </div>

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto divide-y divide-slate-100 py-1"
          >
            {/* Top Option: Leave Unassigned */}
            {allowUnassigned && (
              <li
                role="option"
                aria-selected={!selectedEmp}
                onClick={() => handleSelect(null)}
                onMouseEnter={() => setHighlightedIndex(0)}
                className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                  highlightedIndex === 0
                    ? "bg-[#091329]/5 text-slate-900"
                    : "hover:bg-slate-50 text-slate-700"
                } ${!selectedEmp ? "bg-amber-50/40" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <UserX className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-xs">-- Leave Unassigned --</span>
                </div>
                {!selectedEmp && (
                  <Check className="h-4 w-4 text-[#B08A4A] shrink-0" />
                )}
              </li>
            )}

            {results.length === 0 ? (
              <li className="p-4 text-center text-slate-500 text-xs">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span>Searching employees...</span>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-700">No employees found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try searching with another name, Employee ID (e.g. SEC184), or designation.
                    </p>
                  </div>
                )}
              </li>
            ) : (
              results.map((emp, idx) => {
                const listIdx = allowUnassigned ? idx + 1 : idx;
                const isSelected = selectedEmp?.id === emp.id;
                const isHighlighted = listIdx === highlightedIndex;
                const isSelectable = emp.available;

                return (
                  <li
                    key={emp.id}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={!isSelectable}
                    onClick={() => {
                      if (isSelectable) {
                        handleSelect(emp);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(listIdx)}
                    className={`p-2.5 transition-colors ${
                      isSelectable
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-50 bg-slate-50/80"
                    } ${
                      isHighlighted && isSelectable
                        ? "bg-[#091329]/5 text-slate-900"
                        : isHighlighted && !isSelectable
                        ? "bg-slate-100/70"
                        : ""
                    } ${isSelected ? "bg-amber-50/40" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        {/* 1. Name, 2. Employee ID, 3. Designation, 4. Department */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold text-xs ${
                              isSelectable ? "text-slate-900" : "text-slate-500 line-through decoration-slate-400"
                            }`}
                          >
                            {emp.name}
                          </span>
                          {emp.employeeId && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-semibold tracking-wider">
                              {emp.employeeId}
                            </span>
                          )}
                          {emp.designation && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              • {emp.designation}
                            </span>
                          )}
                          {emp.department && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              ({emp.department})
                            </span>
                          )}
                        </div>

                        {/* 5. Availability Status Badge */}
                        <div>
                          {emp.available ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertCircle className="h-2.5 w-2.5 text-rose-600" />
                              {emp.conflictReason || "Occupied (Overlapping appointment)"}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 text-[#B08A4A] shrink-0" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
