"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Siren,
  ArrowLeft,
  Flame,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  User,
  MapPin,
  FileText,
  UserPlus,
} from "lucide-react";
import {
  SearchableEmergencyMemberSelect,
} from "./SearchableEmergencyMemberSelect";
import { EmergencyMemberSearchResult } from "@/app/actions/emergency";

export function EmergencyNewIncidentClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedMember, setSelectedMember] =
    useState<EmergencyMemberSearchResult | null>(null);
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [triggerSource, setTriggerSource] = useState<
    "HELPLINE_CALL" | "MANUAL_ENTRY" | "MEMBER_APP_SOS"
  >("HELPLINE_CALL");
  const [classification, setClassification] = useState<
    "CODE_RED" | "CODE_YELLOW" | "CODE_GREEN"
  >("CODE_RED");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleMemberSelect = (member: EmergencyMemberSearchResult | null) => {
    setSelectedMember(member);
    if (member) {
      setCallerName(member.name);
      if (member.phone) setCallerPhone(member.phone);
      if (member.address) setAddress(member.address);
    } else {
      // Cleared / non-member mode
      setCallerName("");
      setCallerPhone("");
      setAddress("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!callerName.trim()) {
      setError("Please provide the caller or member name");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/emergency/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedMember?.id || undefined,
            memberId: selectedMember?.memberId || undefined,
            callerName,
            callerPhone,
            triggerSource,
            initialClassification: classification,
            notes,
            fallbackAddress: address,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to create incident");
        }

        router.push(`/emergencyos/incidents/${data.incidentId}`);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/emergencyos"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#091329] hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#091329] flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-red-600" />
            Log Inbound Emergency / Manual SOS
          </h1>
          <p className="text-xs text-slate-500">
            Intake for emergency calls or manual operator dispatches
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm"
      >
        {/* Triage Classification Select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Initial Emergency Classification *
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setClassification("CODE_RED")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                classification === "CODE_RED"
                  ? "bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-900 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-black text-xs text-red-700">
                <Flame className="w-4 h-4 text-red-600" />
                CODE RED
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Life-threatening / Critical
              </div>
            </button>

            <button
              type="button"
              onClick={() => setClassification("CODE_YELLOW")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                classification === "CODE_YELLOW"
                  ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-900 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-black text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                CODE YELLOW
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Urgent / High Priority
              </div>
            </button>

            <button
              type="button"
              onClick={() => setClassification("CODE_GREEN")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                classification === "CODE_GREEN"
                  ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-700">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                CODE GREEN
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Routine / Non-critical
              </div>
            </button>
          </div>
        </div>

        {/* Searchable Member Component */}
        <SearchableEmergencyMemberSelect
          selectedMember={selectedMember}
          onSelectMember={handleMemberSelect}
        />

        {/* Caller Details Section */}
        <div className="pt-2 border-t border-slate-100 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {selectedMember ? "Verified Elder Details" : "Manual Caller Information"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Caller / Elder Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="e.g. Prabir Kumar Bose"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-[#091329] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/10 focus:border-[#091329]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone Number
              </label>
              <div className="relative">
                <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  placeholder="e.g. 9830012345"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-[#091329] font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/10 focus:border-[#091329]"
                />
              </div>
            </div>
          </div>

          {/* Trigger Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trigger Source
            </label>
            <select
              value={triggerSource}
              onChange={(e) => setTriggerSource(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-[#091329] focus:outline-none focus:ring-2 focus:ring-[#091329]/10 focus:border-[#091329]"
            >
              <option value="HELPLINE_CALL">24/7 Helpline Inbound Call (033-4058-5515)</option>
              <option value="MANUAL_ENTRY">Manual Dispatch / Operator Entry</option>
              <option value="MEMBER_APP_SOS">Member App SOS Alert</option>
            </select>
          </div>

          {/* Physical Address / Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scene Address / Landmark
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 42B Southern Avenue, Near Lake Stadium, Kolkata 700029"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-[#091329] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/10 focus:border-[#091329]"
              />
            </div>
          </div>

          {/* Emergency Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Details & Symptoms Reported
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Elder reported severe breathlessness. Family requested immediate caregiver and ambulance assistance."
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-[#091329] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#091329]/10 focus:border-[#091329] resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Siren className="w-4 h-4" />
          {isPending ? "Creating Incident..." : "Trigger Emergency Incident & Open Console"}
        </button>
      </form>
    </div>
  );
}
