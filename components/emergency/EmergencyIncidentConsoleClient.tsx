"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  AlertTriangle,
  CheckCircle,
  Siren,
  Clock,
  User,
  Phone,
  MapPin,
  Building,
  HeartPulse,
  AlertCircle,
  ShieldCheck,
  Send,
  Navigation,
  FileCheck,
  PhoneCall,
  History,
  CheckCircle2,
  Lock,
  ExternalLink,
} from "lucide-react";
import {
  acknowledgeEmergencyIncidentAction,
  classifyEmergencyIncidentAction,
  dispatchEmergencyResponderAction,
  recordEmergencyArrivalAction,
  recordEmergencySafetyAction,
  logEmergencyCallAction,
  addEmergencyNoteAction,
  resolveEmergencyIncidentAction,
} from "@/app/actions/emergency";

interface IncidentLog {
  id: string;
  authorName: string;
  action: string;
  details: string;
  callRecipient?: string | null;
  callPhone?: string | null;
  callOutcome?: string | null;
  createdAt: string | Date;
}

interface IncidentDetail {
  id: string;
  incidentNumber: string;
  status: string;
  classification: string;
  previousClassification?: string | null;
  userId?: string | null;
  memberId?: string | null;
  callerName?: string | null;
  callerPhone?: string | null;
  triggerSource: string;
  triggerNotes?: string | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  locationAccuracy?: number | null;
  locationTimestamp?: string | Date | null;
  trackingActive: boolean;
  fallbackAddress?: string | null;
  assignedEmployeeId?: string | null;
  dispatchNotes?: string | null;
  dispatchedAt?: string | Date | null;
  responderArrivedAt?: string | Date | null;
  triggeredAt: string | Date;
  acknowledgedAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  resolutionNotes?: string | null;
  safetyConfirmedAt?: string | Date | null;
  safetyConfirmedBy?: string | null;
  safetyNotes?: string | null;
  downgradeReason?: string | null;
  downgradeApprovedAt?: string | Date | null;
  downgradedBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  assignedEmployee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    contactNumber?: string | null;
    designation: string;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    emergencyContact?: {
      id: string;
      fullName: string;
      relationship: string;
      phone: string;
      alternatePhone?: string | null;
      address?: string | null;
    } | null;
    subscriptions?: Array<{
      status: string;
      carePlan?: { name: string } | null;
      variantType?: string | null;
      durationMonths?: number | null;
    }> | null;
    memberProfile?: {
      id: string;
      memberId: string | null;
      firstName: string;
      lastName: string;
      salutation?: string | null;
      mobileNumber?: string | null;
      alternateNumber?: string | null;
      serviceAddress?: string | null;
      nearestLandmark?: string | null;
      bloodGroup?: string | null;
      medicalConditions?: string | null;
      sponsor?: {
        fullName: string;
        relationship: string;
        mobileNumber: string;
        alternateNumber?: string | null;
      } | null;
      medicalAuth?: {
        hospitalForSos?: string | null;
        nomineeLocalContact?: string | null;
      } | null;
    } | null;
  } | null;
  logs: IncidentLog[];
}

interface ResponderOption {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  contactNumber?: string | null;
}

interface EmergencyIncidentConsoleClientProps {
  initialIncident: IncidentDetail;
  responders: ResponderOption[];
  isSupervisor: boolean;
  currentUserName: string;
}

export function EmergencyIncidentConsoleClient({
  initialIncident,
  responders,
  isSupervisor,
  currentUserName,
}: EmergencyIncidentConsoleClientProps) {
  const [incident, setIncident] = useState<IncidentDetail>(initialIncident);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [targetDowngradeClassification, setTargetDowngradeClassification] =
    useState<"CODE_YELLOW" | "CODE_GREEN">("CODE_YELLOW");
  const [downgradeReason, setDowngradeReason] = useState("");
  const [downgradeError, setDowngradeError] = useState<string | null>(null);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Dispatch state
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");

  // Safety confirmation state
  const [safetyConfirmer, setSafetyConfirmer] = useState("");
  const [safetyNotesInput, setSafetyNotesInput] = useState("");

  // Call logger state
  const [callRecipient, setCallRecipient] = useState("Member");
  const [callPhone, setCallPhone] = useState(
    initialIncident.callerPhone ||
      initialIncident.user?.memberProfile?.mobileNumber ||
      initialIncident.user?.emergencyContact?.phone ||
      ""
  );
  const [callOutcome, setCallOutcome] = useState<
    "ANSWERED" | "BUSY" | "NO_ANSWER" | "VOICEMAIL" | "FAILED"
  >("ANSWERED");
  const [callDetails, setCallDetails] = useState("");

  // Quick note state
  const [quickNote, setQuickNote] = useState("");

  const isCodeRed = incident.classification === "CODE_RED";
  const isResolved = incident.status === "RESOLVED";

  // Acknowledge Action
  const handleAcknowledge = async () => {
    startTransition(async () => {
      try {
        const res = await acknowledgeEmergencyIncidentAction(incident.id);
        setIncident((prev) => ({
          ...prev,
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date().toISOString(),
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "ACKNOWLEDGED",
              details: `Incident acknowledged by operator ${currentUserName}.`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      } catch (err: any) {
        alert(err.message || "Failed to acknowledge");
      }
    });
  };

  // Classification Change
  const handleClassificationClick = (
    newClass: "CODE_RED" | "CODE_YELLOW" | "CODE_GREEN"
  ) => {
    if (newClass === incident.classification) return;

    if (incident.classification === "CODE_RED") {
      // Downgrade strictly requires supervisor
      setTargetDowngradeClassification(newClass as any);
      setDowngradeReason("");
      setDowngradeError(null);
      setShowDowngradeModal(true);
      return;
    }

    // Upgrade to CODE RED or yellow/green switch
    startTransition(async () => {
      try {
        await classifyEmergencyIncidentAction(
          incident.id,
          newClass,
          "Operator updated classification"
        );
        setIncident((prev) => ({
          ...prev,
          classification: newClass,
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "CLASSIFIED",
              details: `Classification updated to ${newClass}.`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      } catch (err: any) {
        alert(err.message || "Failed to update classification");
      }
    });
  };

  // Confirm Supervisor Downgrade
  const handleConfirmDowngrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setDowngradeError(null);

    if (!isSupervisor) {
      setDowngradeError("Downgrading a CODE RED incident strictly requires supervisor authorization.");
      return;
    }

    if (!downgradeReason.trim() || downgradeReason.trim().length < 5) {
      setDowngradeError("Please provide a detailed clinical or operational justification (at least 5 characters).");
      return;
    }

    startTransition(async () => {
      try {
        await classifyEmergencyIncidentAction(
          incident.id,
          targetDowngradeClassification,
          downgradeReason
        );
        setIncident((prev) => ({
          ...prev,
          classification: targetDowngradeClassification,
          downgradeReason,
          downgradeApprovedAt: new Date().toISOString(),
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "DOWNGRADED",
              details: `Downgraded from CODE RED to ${targetDowngradeClassification}. Supervisor Authorization: ${currentUserName}. Justification: ${downgradeReason}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        setShowDowngradeModal(false);
      } catch (err: any) {
        setDowngradeError(err.message || "Failed to approve downgrade");
      }
    });
  };

  // Dispatch Responder
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResponderId) {
      alert("Please select a field employee to dispatch");
      return;
    }

    const responderObj = responders.find((r) => r.id === selectedResponderId);

    startTransition(async () => {
      try {
        await dispatchEmergencyResponderAction(
          incident.id,
          selectedResponderId,
          dispatchNotes
        );
        setIncident((prev) => ({
          ...prev,
          status: "DISPATCHED",
          assignedEmployeeId: selectedResponderId,
          dispatchNotes,
          dispatchedAt: new Date().toISOString(),
          assignedEmployee: responderObj
            ? {
                id: responderObj.id,
                employeeId: responderObj.employeeId,
                firstName: responderObj.firstName,
                lastName: responderObj.lastName,
                contactNumber: responderObj.contactNumber,
                designation: responderObj.designation,
              }
            : null,
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "DISPATCHED",
              details: `Dispatched responder ${responderObj?.firstName} ${responderObj?.lastName} (${responderObj?.employeeId}). Notes: ${dispatchNotes || "None"}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      } catch (err: any) {
        alert(err.message || "Failed to dispatch responder");
      }
    });
  };

  // Record Arrival On Scene
  const handleRecordArrival = async () => {
    startTransition(async () => {
      try {
        await recordEmergencyArrivalAction(incident.id, "Responder reached scene");
        setIncident((prev) => ({
          ...prev,
          status: "RESPONDER_ON_SCENE",
          responderArrivedAt: new Date().toISOString(),
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "ARRIVED",
              details: `Field responder arrived on scene.`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      } catch (err: any) {
        alert(err.message || "Failed to record arrival");
      }
    });
  };

  // Safety Confirmation
  const handleConfirmSafety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyConfirmer.trim() || !safetyNotesInput.trim()) {
      alert("Please provide the confirmer name and safety verification notes");
      return;
    }

    startTransition(async () => {
      try {
        await recordEmergencySafetyAction(
          incident.id,
          safetyConfirmer,
          safetyNotesInput
        );
        setIncident((prev) => ({
          ...prev,
          safetyConfirmedAt: new Date().toISOString(),
          safetyConfirmedBy: safetyConfirmer,
          safetyNotes: safetyNotesInput,
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "SAFETY_CONFIRMED",
              details: `Member safety confirmed by ${safetyConfirmer}. Notes: ${safetyNotesInput}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      } catch (err: any) {
        alert(err.message || "Failed to record safety confirmation");
      }
    });
  };

  // Log Call
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callPhone.trim()) {
      alert("Please enter the dialed telephone number");
      return;
    }

    startTransition(async () => {
      try {
        await logEmergencyCallAction(
          incident.id,
          callRecipient,
          callPhone,
          callOutcome,
          callDetails
        );
        setIncident((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "CALL_LOGGED",
              callRecipient,
              callPhone,
              callOutcome,
              details: `Call to ${callRecipient} (${callPhone}) - Outcome: ${callOutcome}. Notes: ${callDetails || "None"}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        setCallDetails("");
      } catch (err: any) {
        alert(err.message || "Failed to log call");
      }
    });
  };

  // Add Quick Note
  const handleAddQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    startTransition(async () => {
      try {
        await addEmergencyNoteAction(incident.id, quickNote);
        setIncident((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "NOTE_ADDED",
              details: quickNote,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        setQuickNote("");
      } catch (err: any) {
        alert(err.message || "Failed to add note");
      }
    });
  };

  // Resolve Incident
  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolveError(null);

    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      setResolveError("Please provide a thorough resolution summary (min 5 characters).");
      return;
    }

    startTransition(async () => {
      try {
        await resolveEmergencyIncidentAction(incident.id, resolutionNotes);
        setIncident((prev) => ({
          ...prev,
          status: "RESOLVED",
          resolvedAt: new Date().toISOString(),
          resolutionNotes,
          trackingActive: false,
          logs: [
            ...prev.logs,
            {
              id: `temp-${Date.now()}`,
              authorName: currentUserName,
              action: "RESOLVED",
              details: `Incident resolved and closed. Operator: ${currentUserName}. GPS tracking terminated. Summary: ${resolutionNotes}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        setShowResolveModal(false);
      } catch (err: any) {
        setResolveError(err.message || "Failed to resolve incident");
      }
    });
  };

  const prof = incident.user?.memberProfile;
  const userContact = incident.user?.emergencyContact;
  const activeSub = incident.user?.subscriptions?.[0];
  const planDisplay = activeSub?.carePlan
    ? `${activeSub.carePlan.name} — ${activeSub.variantType === 'COUPLE' ? 'Couple' : 'Single'} (${activeSub.durationMonths} Months)`
    : null;

  const memberName =
    incident.callerName ||
    (prof
      ? `${prof.salutation || ""} ${prof.firstName} ${prof.lastName}`.trim()
      : "Unknown Member");

  const address =
    incident.fallbackAddress ||
    prof?.serviceAddress ||
    "Not available";

  return (
    <div className="space-y-6">
      {/* Top Header: Nav, Status Stepper & Triage Select */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/emergencyos"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-white">
                  {incident.incidentNumber}
                </span>
                <span
                  className={`text-xs font-black uppercase px-2.5 py-0.5 rounded ${
                    isCodeRed
                      ? "bg-red-600 text-white"
                      : incident.classification === "CODE_YELLOW"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {incident.classification.replace("_", " ")}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                    incident.status === "TRIGGERED"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                      : incident.status === "ACKNOWLEDGED"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : incident.status === "DISPATCHED"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      : incident.status === "RESPONDER_ON_SCENE"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {incident.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>Triggered: {new Date(incident.triggeredAt).toLocaleString("en-IN")}</span>
                <span>Source: {incident.triggerSource.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Header: Acknowledge & Triage Classification Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {incident.status === "TRIGGERED" && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={isPending}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 hover:bg-red-500 text-white shadow transition-all animate-pulse"
              >
                {isPending ? "Acknowledging..." : "Acknowledge Incident"}
              </button>
            )}

            {/* Classification Buttons */}
            {!isResolved && (
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleClassificationClick("CODE_RED")}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                    isCodeRed
                      ? "bg-red-600 text-white"
                      : "text-red-400 hover:text-white"
                  }`}
                >
                  Red
                </button>
                <button
                  type="button"
                  onClick={() => handleClassificationClick("CODE_YELLOW")}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                    incident.classification === "CODE_YELLOW"
                      ? "bg-amber-600 text-white"
                      : "text-amber-400 hover:text-white"
                  }`}
                >
                  Yellow
                </button>
                <button
                  type="button"
                  onClick={() => handleClassificationClick("CODE_GREEN")}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                    incident.classification === "CODE_GREEN"
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-400 hover:text-white"
                  }`}
                >
                  Green
                </button>
              </div>
            )}

            {!isResolved && (
              <button
                type="button"
                onClick={() => {
                  setResolutionNotes("");
                  setResolveError(null);
                  setShowResolveModal(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Resolve & Close
              </button>
            )}
          </div>
        </div>

        {/* Status Stepper Progression */}
        <div className="grid grid-cols-5 gap-2 text-center pt-2 border-t border-slate-800/80">
          {[
            { key: "TRIGGERED", label: "1. Triggered", date: incident.triggeredAt },
            { key: "ACKNOWLEDGED", label: "2. Acknowledged", date: incident.acknowledgedAt },
            { key: "DISPATCHED", label: "3. Dispatched", date: incident.dispatchedAt },
            { key: "RESPONDER_ON_SCENE", label: "4. On Scene", date: incident.responderArrivedAt },
            { key: "RESOLVED", label: "5. Resolved", date: incident.resolvedAt },
          ].map((step, idx) => {
            const isCompleted = Boolean(step.date);
            const isCurrent = incident.status === step.key;

            return (
              <div
                key={step.key}
                className={`p-2 rounded-lg border text-left ${
                  isCurrent
                    ? "bg-slate-800 border-red-500 ring-1 ring-red-500/40 text-white"
                    : isCompleted
                    ? "bg-slate-900 border-emerald-900/40 text-emerald-300"
                    : "bg-slate-950/60 border-slate-800 text-slate-500"
                }`}
              >
                <div className="text-[11px] font-bold">{step.label}</div>
                <div className="text-[10px] mt-0.5 truncate">
                  {step.date
                    ? new Date(step.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-Column Command Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMN 1: Member Profile, Medical Flags, Emergency Contacts (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Senior Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                Senior Member Profile
              </h2>
              {incident.memberId && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                  {incident.memberId}
                </span>
              )}
            </div>

            <div>
              <div className="text-base font-bold text-white">{memberName}</div>
              {planDisplay && (
                <div className="text-xs text-amber-400 font-medium mt-0.5">
                  Plan: {planDisplay}
                </div>
              )}
            </div>

            {/* Contact Phones */}
            <div className="space-y-1.5 text-xs">
              <div className="text-slate-400 font-semibold">Primary Contact Phone:</div>
              <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg">
                <span className="font-mono text-white font-bold">
                  {incident.callerPhone || prof?.mobileNumber || userContact?.phone || "Not provided"}
                </span>
                {(incident.callerPhone || prof?.mobileNumber || userContact?.phone) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCallRecipient("Member");
                      setCallPhone(incident.callerPhone || prof?.mobileNumber || userContact?.phone || "");
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white font-bold"
                  >
                    Dial / Log
                  </button>
                )}
              </div>
              {(prof?.alternateNumber || userContact?.alternatePhone) && (
                <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg">
                  <span className="font-mono text-slate-300">
                    Alt: {prof?.alternateNumber || userContact?.alternatePhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCallRecipient("Member (Alt)");
                      setCallPhone(prof?.alternateNumber || userContact?.alternatePhone || "");
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    Dial / Log
                  </button>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1 text-xs">
              <div className="text-slate-400 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                Registered Address:
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 text-slate-200 leading-relaxed">
                {address}
              </div>
              {prof?.nearestLandmark && (
                <div className="text-[11px] text-amber-300">
                  Landmark: {prof.nearestLandmark}
                </div>
              )}
            </div>
          </div>

          {/* Designated Emergency Hospital & Physician */}
          <div className="bg-slate-900 border border-red-950/80 rounded-xl p-5 shadow space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-red-400">
              <Building className="w-4 h-4" />
              Designated Emergency Hospital
            </div>

            <div>
              <div className="text-xs text-slate-400">Preferred Hospital for SOS:</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {prof?.medicalAuth?.hospitalForSos || "Nearest Tertiary Multi-specialty Hospital"}
              </div>
            </div>

            {prof?.medicalAuth?.nomineeLocalContact && (
              <div className="pt-2 border-t border-slate-800 text-xs">
                <div className="text-slate-400">Nominee Local Contact:</div>
                <div className="font-semibold text-slate-200">
                  {prof.medicalAuth.nomineeLocalContact}
                </div>
              </div>
            )}
          </div>

          {/* Medical Alerts & Pre-existing Conditions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-amber-400">
              <HeartPulse className="w-4 h-4" />
              Medical Profile & Alerts
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Blood Group</span>
                <span className="font-bold text-white">
                  {prof?.bloodGroup || "Not recorded"}
                </span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded">
                <span className="text-slate-400 block text-[10px]">Medical Status</span>
                <span className="font-semibold text-amber-400">
                  {prof?.medicalConditions ? "Conditions Logged" : "Standard"}
                </span>
              </div>
            </div>

            {prof?.medicalConditions && (
              <div className="text-xs">
                <div className="text-slate-400 font-semibold">Conditions & Notes:</div>
                <div className="p-2 rounded bg-slate-800/60 text-slate-200 mt-1">
                  {prof.medicalConditions}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Family Contacts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-slate-300">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              Emergency Family Contacts
            </div>

            {/* Primary Emergency Contact */}
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">
                  {userContact?.fullName || prof?.sponsor?.fullName || "Primary Contact Not Recorded"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {userContact?.relationship || prof?.sponsor?.relationship || "Primary"}
                </span>
              </div>
              {(userContact?.phone || prof?.sponsor?.mobileNumber) && (
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-emerald-400 font-bold">
                    {userContact?.phone || prof?.sponsor?.mobileNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const name = userContact?.fullName || prof?.sponsor?.fullName || "Contact";
                      const phone = userContact?.phone || prof?.sponsor?.mobileNumber || "";
                      setCallRecipient(name);
                      setCallPhone(phone);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold"
                  >
                    Log Call
                  </button>
                </div>
              )}
            </div>

            {/* Secondary Emergency Contact */}
            {prof?.sponsor?.alternateNumber && (
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    {prof.sponsor.fullName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    Alt Contact
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-emerald-400 font-bold">
                    {prof.sponsor.alternateNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCallRecipient(`${prof?.sponsor?.fullName} (Alt)`);
                      setCallPhone(prof?.sponsor?.alternateNumber || "");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold"
                  >
                    Log Call
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: Telemetry, Field Dispatch, Safety & Resolution (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live GPS Telemetry Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-red-500 animate-pulse" />
                Live GPS Telemetry
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  incident.trackingActive
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {incident.trackingActive ? "TRACKING ACTIVE" : "TRACKING TERMINATED"}
              </span>
            </div>

            {incident.currentLatitude && incident.currentLongitude ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-slate-400 flex justify-between">
                    <span>Latitude:</span>
                    <span className="text-white font-bold">
                      {incident.currentLatitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Longitude:</span>
                    <span className="text-white font-bold">
                      {incident.currentLongitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Accuracy:</span>
                    <span className="text-emerald-400 font-bold">
                      ±{Math.round(incident.locationAccuracy || 10)} meters
                    </span>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${incident.currentLatitude},${incident.currentLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Live Coordinates in Google Maps
                </a>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  GPS Signal Pending / Fallback to Address
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Target responder to registered primary address: {address}
                </p>
              </div>
            )}

            <div className="p-2.5 rounded bg-slate-950/70 text-[10px] text-slate-500 border border-slate-800 leading-tight">
              Privacy Safeguard: Location is streamed only during active SOS. Resolving the incident immediately revokes GPS ingestion with HTTP 410.
            </div>
          </div>

          {/* Field Responder Dispatch Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              Field Employee Dispatch
            </div>

            {incident.assignedEmployee ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {incident.assignedEmployee.firstName}{" "}
                      {incident.assignedEmployee.lastName}
                    </span>
                    <span className="font-mono text-blue-300 font-bold">
                      {incident.assignedEmployee.employeeId}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Designation: {incident.assignedEmployee.designation}
                  </div>
                  {incident.assignedEmployee.contactNumber && (
                    <div className="flex items-center justify-between pt-1 border-t border-blue-900/40">
                      <span className="font-mono text-amber-400 font-bold">
                        {incident.assignedEmployee.contactNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCallRecipient(
                            `Responder ${incident.assignedEmployee?.firstName}`
                          );
                          setCallPhone(
                            incident.assignedEmployee?.contactNumber || ""
                          );
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-700 text-white font-bold"
                      >
                        Dial / Log Call
                      </button>
                    </div>
                  )}
                  {incident.dispatchedAt && (
                    <div className="text-[10px] text-slate-400">
                      Dispatched at:{" "}
                      {new Date(incident.dispatchedAt).toLocaleTimeString("en-IN")}
                    </div>
                  )}
                </div>

                {/* Record Arrival on scene */}
                {incident.status === "DISPATCHED" && (
                  <button
                    type="button"
                    onClick={handleRecordArrival}
                    disabled={isPending}
                    className="w-full py-2.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Record Responder Arrival On Scene
                  </button>
                )}

                {incident.responderArrivedAt && (
                  <div className="p-2.5 rounded bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400" />
                    <span>
                      Responder on scene since{" "}
                      {new Date(incident.responderArrivedAt).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            ) : !isResolved ? (
              <form onSubmit={handleDispatch} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Active Field Responder
                  </label>
                  <select
                    required
                    value={selectedResponderId}
                    onChange={(e) => setSelectedResponderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Field Responder --</option>
                    {responders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.firstName} {r.lastName} ({r.employeeId}) • {r.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dispatch Instructions / Route Notes
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="e.g. Proceed with portable oxygen kit and vitals monitor"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || !selectedResponderId}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Responder
                </button>
              </form>
            ) : (
              <div className="text-xs text-slate-500">
                No responder dispatched before incident resolution.
              </div>
            )}
          </div>

          {/* Member Safety Confirmation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-emerald-400">
              <FileCheck className="w-4 h-4" />
              Member Safety Confirmation
            </div>

            {incident.safetyConfirmedAt ? (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Safety Confirmed by {incident.safetyConfirmedBy}
                </div>
                <div className="text-slate-300 leading-relaxed">
                  {incident.safetyNotes}
                </div>
                <div className="text-[10px] text-slate-500">
                  Confirmed at:{" "}
                  {new Date(incident.safetyConfirmedAt).toLocaleTimeString("en-IN")}
                </div>
              </div>
            ) : !isResolved ? (
              <form onSubmit={handleConfirmSafety} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirmed By (Responder / Doctor / Relative)
                  </label>
                  <input
                    type="text"
                    required
                    value={safetyConfirmer}
                    onChange={(e) => setSafetyConfirmer(e.target.value)}
                    placeholder="e.g. Sagnik Kar (Field Caregiver)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Safety Notes & Elder Condition
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={safetyNotesInput}
                    onChange={(e) => setSafetyNotesInput(e.target.value)}
                    placeholder="e.g. Vitals normal (BP 125/80, Pulse 74). Elder resting comfortably under family supervision."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow transition-colors"
                >
                  Confirm Member Safety
                </button>
              </form>
            ) : (
              <div className="text-xs text-slate-500">
                Safety status closed upon resolution.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Communication Logger & Activity Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Outbound Call Logger */}
          {!isResolved && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-slate-300">
                <Phone className="w-4 h-4 text-amber-400" />
                Log Emergency Outbound Call
              </div>

              <form onSubmit={handleLogCall} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Recipient
                    </label>
                    <select
                      value={callRecipient}
                      onChange={(e) => setCallRecipient(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
                    >
                      <option value="Member">Elder / Member</option>
                      <option value="Primary Contact">Primary Contact</option>
                      <option value="Secondary Contact">Secondary Contact</option>
                      <option value="Hospital">Hospital ER</option>
                      <option value="Ambulance">108 Ambulance</option>
                      <option value="Field Responder">Field Caregiver</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={callPhone}
                      onChange={(e) => setCallPhone(e.target.value)}
                      placeholder="e.g. 9830012345"
                      className="w-full px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Call Outcome
                  </label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none"
                  >
                    <option value="ANSWERED">Answered (Spoke with recipient)</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="BUSY">Line Busy</option>
                    <option value="VOICEMAIL">Voicemail</option>
                    <option value="FAILED">Call Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Call Notes & Summary
                  </label>
                  <textarea
                    rows={2}
                    value={callDetails}
                    onChange={(e) => setCallDetails(e.target.value)}
                    placeholder="e.g. Inquired about breathing difficulty. Family stated ambulance is en route."
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow transition-colors"
                >
                  Save Call Record
                </button>
              </form>
            </div>
          )}

          {/* Quick Operational Note */}
          {!isResolved && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow space-y-2">
              <form onSubmit={handleAddQuickNote} className="flex gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Add quick operational note..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isPending || !quickNote.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                >
                  Post Note
                </button>
              </form>
            </div>
          )}

          {/* Immutable Audit Trail & Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-400" />
                Immutable Activity Timeline
              </h3>
              <span className="text-[10px] text-slate-500">
                {incident.logs.length} events
              </span>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {incident.logs.map((log) => {
                const isDown = log.action === "DOWNGRADED";
                const isTrigger = log.action === "TRIGGERED";
                const isCall = log.action === "CALL_LOGGED";
                const isResolvedAction = log.action === "RESOLVED";

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      isTrigger
                        ? "bg-red-950/30 border-red-900/60 text-red-200"
                        : isDown
                        ? "bg-amber-950/30 border-amber-900/60 text-amber-200"
                        : isResolvedAction
                        ? "bg-emerald-950/30 border-emerald-900/60 text-emerald-200"
                        : isCall
                        ? "bg-blue-950/20 border-blue-900/40 text-blue-200"
                        : "bg-slate-800/50 border-slate-700/60 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="uppercase tracking-wider">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="text-slate-200 leading-relaxed">{log.details}</div>

                    <div className="text-[10px] text-slate-400 pt-0.5">
                      By: {log.authorName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Supervisor Downgrade Approval Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-xl text-white">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Supervisor Authorization Required
                </h3>
                <p className="text-xs text-red-300">
                  Strict Rule: Downgrading a CODE RED incident requires supervisor approval
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 leading-relaxed">
              You are proposing to downgrade incident{" "}
              <strong className="text-white">{incident.incidentNumber}</strong> to{" "}
              <strong className="text-white">
                {targetDowngradeClassification.replace("_", " ")}
              </strong>
              . This action is permanently stamped in the supervisor audit log.
            </div>

            {downgradeError && (
              <div className="p-3 text-xs rounded-lg bg-red-950 border border-red-700 text-red-200 font-medium">
                {downgradeError}
              </div>
            )}

            {!isSupervisor ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Your current account does not have supervisor credentials (
                  <code className="text-red-400">EMERGENCY_INCIDENT_SUPERVISE</code>).
                  Please contact the on-duty Emergency Supervisor to authorize this change.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDowngradeModal(false)}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmDowngrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supervisor Justification / Clinical Assessment *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={downgradeReason}
                    onChange={(e) => setDowngradeReason(e.target.value)}
                    placeholder="State reason: e.g. Contacted family; elder had accidental SOS press; verified fully conscious and vitals steady."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDowngradeModal(false)}
                    className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 hover:bg-red-500 text-white shadow"
                  >
                    {isPending ? "Authorizing..." : "Authorize Downgrade"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Resolve & Close Incident Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-xl text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Resolve Emergency Incident
                </h3>
                <p className="text-xs text-slate-400">
                  Complete incident closure & terminate location telemetry
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              Closing this incident will set status to <strong>RESOLVED</strong> and immediately
              cut off GPS streaming (HTTP 410 Gone).
            </div>

            {resolveError && (
              <div className="p-3 text-xs rounded-lg bg-red-950 border border-red-700 text-red-200 font-medium">
                {resolveError}
              </div>
            )}

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resolution Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Field responder attended scene. Attending doctor stabilized elder. Member safe in family care. Incident closed."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                >
                  {isPending ? "Closing..." : "Close & Resolve Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
