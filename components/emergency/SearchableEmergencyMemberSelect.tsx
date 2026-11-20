"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  Search,
  Check,
  X,
  User,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import {
  searchEmergencyMembersAction,
  EmergencyMemberSearchResult,
} from "@/app/actions/emergency";

interface SearchableEmergencyMemberSelectProps {
  onSelectMember: (member: EmergencyMemberSearchResult | null) => void;
  selectedMember: EmergencyMemberSearchResult | null;
}

export function SearchableEmergencyMemberSelect({
  onSelectMember,
  selectedMember,
}: SearchableEmergencyMemberSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmergencyMemberSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    debounceTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchEmergencyMembersAction(trimmed);
          setResults(res);
          setIsOpen(true);
        } catch (err) {
          console.error("Member search error:", err);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      });
    }, 250);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSelect = (member: EmergencyMemberSearchResult) => {
    onSelectMember(member);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onSelectMember(null);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleSelectNonMember = () => {
    onSelectMember(null);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Caller / Member Identification *
        </label>
        {selectedMember && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
          >
            Clear / Switch Caller
          </button>
        )}
      </div>

      {/* When a member is selected */}
      {selectedMember ? (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-full bg-emerald-600 text-white">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-bold text-[#091329]">
                {selectedMember.name}
              </span>
              {selectedMember.memberId && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white text-emerald-800 font-bold border border-emerald-200">
                  {selectedMember.memberId}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              {selectedMember.phone && (
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedMember.phone}</span>
                </div>
              )}
              {selectedMember.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-md">{selectedMember.address}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-emerald-100/60 transition-colors"
            title="Change selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setIsOpen(true);
              }}
              placeholder="Search by full name, Member ID (e.g. SEC...), or mobile number..."
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white border border-slate-300 text-[#091329] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/10 focus:border-[#091329] shadow-sm transition-all"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Dropdown Panel */}
          {isOpen && query.trim().length >= 2 && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#091329]" />
                  <span>Searching registered member database...</span>
                </div>
              ) : results.length === 0 && hasSearched ? (
                <div className="p-4 text-center space-y-2">
                  <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>No registered members matched &ldquo;{query}&rdquo;</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectNonMember}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-[#091329] transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Continue as Non-member / Manual Caller
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium px-3">
                    <span>{results.length} Matching Members Found</span>
                    <button
                      type="button"
                      onClick={handleSelectNonMember}
                      className="text-[#091329] font-bold hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Non-member Caller
                    </button>
                  </div>
                  {results.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelect(member)}
                      className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#091329] group-hover:text-red-600 transition-colors">
                            {member.name}
                          </span>
                          {member.memberId && (
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {member.memberId}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3">
                          {member.phone && (
                            <span className="font-mono text-slate-600">
                              {member.phone}
                            </span>
                          )}
                          {member.address && (
                            <span className="truncate max-w-xs text-slate-500">
                              {member.address}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-[#091329] transition-colors whitespace-nowrap self-center">
                        Select →
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
