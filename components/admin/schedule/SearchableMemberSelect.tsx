"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  searchScheduleMembers,
  ScheduleMemberSearchResult,
} from "@/app/actions/care-schedule";
import {
  Search,
  Check,
  X,
  User,
  ShieldCheck,
  Phone,
  MapPin,
  Loader2,
  ChevronDown,
  Edit2,
} from "lucide-react";

export interface SearchableMemberSelectProps {
  name?: string; // Form input name, default: "caseSelectionId"
  value?: string; // Currently selected careCaseId / caseSelectionId
  onChange?: (selected: ScheduleMemberSearchResult | null) => void;
  initialCases?: Array<ScheduleMemberSearchResult | any>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
}

export function SearchableMemberSelect({
  name = "caseSelectionId",
  value = "",
  onChange,
  initialCases = [],
  placeholder = "Search member by name, ID (e.g. SECD1001), address...",
  disabled = false,
  required = false,
  label = "Member / Care Recipient",
  className = "",
}: SearchableMemberSelectProps) {
  const [selected, setSelected] = useState<ScheduleMemberSearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScheduleMemberSearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRequestId = useRef(0);

  // Sync initial selection from props or initialCases
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }

    if (selected && (selected.id === value || selected.careCaseId === value)) {
      return;
    }

    const match = initialCases.find(
      (c) => c.id === value || c.careCaseId === value
    );
    if (match) {
      const normalized: ScheduleMemberSearchResult = {
        id: match.id || match.careCaseId,
        careCaseId: match.careCaseId || match.id,
        memberId: match.memberId || "Not assigned",
        memberName: match.memberName || match.elderName || "Member",
        serviceAddress: match.serviceAddress || "Not available",
        primaryMobile: match.primaryMobile || "Not available",
        subscribedPlan: match.subscribedPlan || "No service plan recorded",
        elderName: match.elderName || match.memberName || "Care Recipient",
        label: match.label || `${match.memberName} (${match.memberId || "No ID"})`,
      };
      setSelected(normalized);
    }
  }, [value, initialCases]);

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

  // Debounced server search with stale-response protection
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      // Show initial cases if query is empty
      const normalizedInitial = initialCases.slice(0, 20).map((match) => ({
        id: match.id || match.careCaseId,
        careCaseId: match.careCaseId || match.id,
        memberId: match.memberId || "Not assigned",
        memberName: match.memberName || match.elderName || "Member",
        serviceAddress: match.serviceAddress || "Not available",
        primaryMobile: match.primaryMobile || "Not available",
        subscribedPlan: match.subscribedPlan || "No service plan recorded",
        elderName: match.elderName || match.memberName || "Care Recipient",
        label: match.label || `${match.memberName} (${match.memberId || "No ID"})`,
      }));
      setResults(normalizedInitial);
      setHighlightedIndex(-1);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const thisRequestId = ++searchRequestId.current;

    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const data = await searchScheduleMembers(trimmed);
          if (thisRequestId === searchRequestId.current) {
            setResults(data);
            setHighlightedIndex(data.length > 0 ? 0 : -1);
            setIsSearching(false);
          }
        } catch (err) {
          if (thisRequestId === searchRequestId.current) {
            setResults([]);
            setIsSearching(false);
          }
        }
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, isOpen, initialCases]);

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

  const handleSelect = (member: ScheduleMemberSearchResult) => {
    setSelected(member);
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
    if (onChange) {
      onChange(member);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelected(null);
    setQuery("");
    setIsOpen(true);
    if (onChange) {
      onChange(null);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
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

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`}>
      {label && (
        <label className="block font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={selected?.id || ""}
        required={required}
      />

      {/* Collapsed Selected State */}
      {selected && !isOpen ? (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`p-3 bg-slate-50/80 border border-slate-300 rounded-xl hover:border-slate-400 cursor-pointer transition-all ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* Member Name + Member ID */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-sm">
                  {selected.memberName}
                </span>
                {selected.memberId && selected.memberId !== "Not assigned" && (
                  <span className="font-mono text-[10px] bg-[#091329] text-white px-2 py-0.5 rounded font-semibold tracking-wider">
                    {selected.memberId}
                  </span>
                )}
                {selected.elderName &&
                  selected.elderName.toLowerCase() !==
                    selected.memberName.toLowerCase() && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      (Elder: {selected.elderName})
                    </span>
                  )}
              </div>

              {/* Subscribed Plan & Mobile */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                <span className="inline-flex items-center gap-1 font-semibold text-[#091329] bg-[#B08A4A]/10 px-2 py-0.5 rounded border border-[#B08A4A]/30">
                  <ShieldCheck className="h-3 w-3 text-[#B08A4A] shrink-0" />
                  {selected.subscribedPlan}
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                  {selected.primaryMobile}
                </span>
              </div>

              {/* Service Address */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate" title={selected.serviceAddress}>
                  {selected.serviceAddress}
                </span>
              </div>
            </div>

            {!disabled && (
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear or change member"
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 rounded-md transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
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
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/20 focus:border-[#091329] transition-all"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 h-3.5 w-3.5 text-slate-400 animate-spin" />
            ) : selected ? (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Autocomplete Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {isSearching
                ? "Searching members..."
                : `${results.length} member${results.length === 1 ? "" : "s"} found`}
            </span>
            <span className="text-[10px] text-slate-400">
              Use ↑↓ arrows to navigate, Enter to select
            </span>
          </div>

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto divide-y divide-slate-100 py-1"
          >
            {results.length === 0 ? (
              <li className="p-4 text-center text-slate-500 text-xs">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span>Searching database...</span>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-700">No matching members found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try searching with another name, canonical Member ID (e.g. SECD1001), or address.
                    </p>
                  </div>
                )}
              </li>
            ) : (
              results.map((member, idx) => {
                const isSelected = selected?.id === member.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={member.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(member)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-[#091329]/5 text-slate-900"
                        : "hover:bg-slate-50 text-slate-800"
                    } ${isSelected ? "bg-amber-50/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        {/* 1. Member Name & 2. Member ID */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {member.memberName}
                          </span>
                          {member.memberId && member.memberId !== "Not assigned" && (
                            <span className="font-mono text-[10px] bg-[#091329] text-white px-1.5 py-0.5 rounded font-semibold tracking-wider">
                              {member.memberId}
                            </span>
                          )}
                          {member.elderName &&
                            member.elderName.toLowerCase() !==
                              member.memberName.toLowerCase() && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                (Elder: {member.elderName})
                              </span>
                            )}
                        </div>

                        {/* 4. Primary Mobile & 5. Subscribed Plan */}
                        <div className="flex items-center gap-3 text-[11px] flex-wrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#091329] bg-[#B08A4A]/10 px-1.5 py-0.5 rounded border border-[#B08A4A]/20">
                            <ShieldCheck className="h-3 w-3 text-[#B08A4A] shrink-0" />
                            {member.subscribedPlan}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            {member.primaryMobile}
                          </span>
                        </div>

                        {/* 3. Full Service Address */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate" title={member.serviceAddress}>
                            {member.serviceAddress}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 text-[#B08A4A] shrink-0 self-center" />
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
