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
} from "lucide-react";

interface MemberOption {
  id: string;
  memberId: string | null;
  name: string;
  phone: string | null;
  address: string | null;
}

interface EmergencyNewIncidentClientProps {
  members: MemberOption[];
}

export function EmergencyNewIncidentClient({
  members,
}: EmergencyNewIncidentClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedMemberId, setSelectedMemberId] = useState("");
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

  const handleMemberSelect = (userId: string) => {
    setSelectedMemberId(userId);
    const m = members.find((x) => x.id === userId);
    if (m) {
      setCallerName(m.name);
      if (m.phone) setCallerPhone(m.phone);
      if (m.address) setAddress(m.address);
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
            userId: selectedMemberId || undefined,
            callerName,
            callerPhone,
            triggerSource,
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
      <div className="flex items-center gap-3">
        <Link
          href="/emergencyos"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-red-500" />
            Log Inbound Emergency Call / Manual SOS
          </h1>
          <p className="text-xs text-slate-400">
            Immediate intake for emergency calls received on helpline (033-4058-5515)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-lg bg-red-950/80 border border-red-800 text-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl"
      >
        {/* Triage Classification Select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Initial Emergency Classification
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setClassification("CODE_RED")}
              className={`p-3 rounded-lg border text-left transition-all ${
                classification === "CODE_RED"
                  ? "bg-red-950/80 border-red-500 text-white ring-2 ring-red-500/50"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 font-black text-xs text-red-400">
                <Flame className="w-4 h-4" />
                CODE RED
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Life-threatening / Critical
              </div>
            </button>

            <button
              type="button"
              onClick={() => setClassification("CODE_YELLOW")}
              className={`p-3 rounded-lg border text-left transition-all ${
                classification === "CODE_YELLOW"
                  ? "bg-amber-950/80 border-amber-500 text-white ring-2 ring-amber-500/50"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 font-black text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                CODE YELLOW
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Urgent / High Priority
              </div>
            </button>

            <button
              type="button"
              onClick={() => setClassification("CODE_GREEN")}
              className={`p-3 rounded-lg border text-left transition-all ${
                classification === "CODE_GREEN"
                  ? "bg-emerald-950/80 border-emerald-500 text-white ring-2 ring-emerald-500/50"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                CODE GREEN
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Routine / Non-critical
              </div>
            </button>
          </div>
        </div>

        {/* Existing Member Select (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Registered Member (Auto-fill details)
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => handleMemberSelect(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
          >
            <option value="">-- Non-member / Manual Caller --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.memberId ? `(${m.memberId})` : ""} {m.phone ? `• ${m.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Caller Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Caller / Elder Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="e.g. Prabir Kumar Bose"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contact Phone Number
            </label>
            <div className="relative">
              <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                placeholder="e.g. 9830012345"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Trigger Source */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Trigger Source
          </label>
          <select
            value={triggerSource}
            onChange={(e) => setTriggerSource(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
          >
            <option value="HELPLINE_CALL">24/7 Helpline Inbound Call (033-4058-5515)</option>
            <option value="MANUAL_ENTRY">Manual Dispatch / Operator Entry</option>
            <option value="MEMBER_APP_SOS">Member App SOS Alert</option>
          </select>
        </div>

        {/* Physical Address / Location */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Scene Address / Landmark
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 42B Southern Avenue, Near Lake Stadium, Kolkata 700029"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Emergency Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Incident Details / Symptoms Reported
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Elder reported severe chest discomfort and breathlessness. Daughter called from Bangalore."
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          <Siren className="w-4 h-4" />
          {isPending ? "Creating Incident..." : "Trigger Emergency Incident & Open Console"}
        </button>
      </form>
    </div>
  );
}
