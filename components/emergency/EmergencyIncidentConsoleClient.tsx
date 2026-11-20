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
        await acknowledgeEmergencyIncidentAction(incident.id);
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

  const contactPhone =
    incident.callerPhone ||
    prof?.mobileNumber ||
    userContact?.phone ||
    null;

  return (
    <div className="space-y-6">
      {/* SECTION A: Incident Overview (Top Priority, Immediately Visible) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Link
              href="/emergencyos"
              className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-[#091329] hover:bg-slate-200 border border-slate-200 transition-colors mt-0.5 sm:mt-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="font-mono text-lg sm:text-xl font-black text-[#091329]">
                  {incident.incidentNumber}
                </span>

                {/* Classification Badge */}
                <span
                  className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                    isCodeRed
                      ? "bg-red-600 text-white"
                      : incident.classification === "CODE_YELLOW"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {isCodeRed && <Flame className="w-3.5 h-3.5" />}
                  {incident.classification.replace("_", " ")}
                </span>

                {/* Status Badge */}
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide ${
                    incident.status === "TRIGGERED"
                      ? "bg-red-100 text-red-700 border border-red-300 animate-pulse"
                      : incident.status === "ACKNOWLEDGED"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : incident.status === "DISPATCHED"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : incident.status === "RESPONDER_ON_SCENE"
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {incident.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Subtitle / Key Details Bar */}
              <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1 font-semibold text-[#091329]">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{memberName}</span>
                  {incident.memberId && (
                    <span className="font-mono text-slate-500 font-normal">
                      ({incident.memberId})
                    </span>
                  )}
                </div>

                {contactPhone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a
                      href={`tel:${contactPhone}`}
                      className="font-mono text-[#B08A4A] font-bold hover:underline"
                    >
                      {contactPhone}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Triggered: {new Date(incident.triggeredAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <div className="text-slate-500">
                  Source: <span className="font-semibold text-slate-700">{incident.triggerSource.replace(/_/g, " ")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {incident.status === "TRIGGERED" && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={isPending}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all animate-pulse"
              >
                {isPending ? "Acknowledging..." : "Acknowledge Incident"}
              </button>
            )}

            {/* Classification Quick Selectors */}
            {!isResolved && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleClassificationClick("CODE_RED")}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                    isCodeRed
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-red-700 hover:bg-white"
                  }`}
                  title="Critical emergency (Life-threatening)"
                >
                  Red
                </button>
                <button
                  type="button"
                  onClick={() => handleClassificationClick("CODE_YELLOW")}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                    incident.classification === "CODE_YELLOW"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-700 hover:bg-white"
                  }`}
                  title="Urgent assistance required"
                >
                  Yellow
                </button>
                <button
                  type="button"
                  onClick={() => handleClassificationClick("CODE_GREEN")}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                    incident.classification === "CODE_GREEN"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-700 hover:bg-white"
                  }`}
                  title="Routine assistance"
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
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Resolve & Close</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Stepper Progression */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100">
          {[
            { key: "TRIGGERED", label: "1. Triggered", date: incident.triggeredAt },
            { key: "ACKNOWLEDGED", label: "2. Acknowledged", date: incident.acknowledgedAt },
            { key: "DISPATCHED", label: "3. Dispatched", date: incident.dispatchedAt },
            { key: "RESPONDER_ON_SCENE", label: "4. On Scene", date: incident.responderArrivedAt },
            { key: "RESOLVED", label: "5. Resolved", date: incident.resolvedAt },
          ].map((step) => {
            const isCompleted = Boolean(step.date);
            const isCurrent = incident.status === step.key;

            return (
              <div
                key={step.key}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  isCurrent
                    ? "bg-red-50 border-red-300 ring-1 ring-red-400 text-red-900"
                    : isCompleted
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-slate-50 border-slate-200 text-slate-400"
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

      {/* 2-Column Responsive Information Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Operations, Profile, GPS, Dispatch & Safety (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION B: Member Information & Medical Profile */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#091329] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#B08A4A]" />
                Member & Clinical Information
              </h2>
              {incident.memberId && (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-[#091329] font-bold border border-slate-200">
                  {incident.memberId}
                </span>
              )}
            </div>

            <div>
              <div className="text-base font-bold text-[#091329]">{memberName}</div>
              {planDisplay && (
                <div className="text-xs text-[#B08A4A] font-semibold mt-0.5">
                  Subscription: {planDisplay}
                </div>
              )}
            </div>

            {/* Contact Phones */}
            <div className="space-y-1.5 text-xs">
              <div className="text-slate-500 font-semibold">Primary Contact Phone:</div>
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                <span className="font-mono text-[#091329] font-bold">
                  {incident.callerPhone || prof?.mobileNumber || userContact?.phone || "Not provided"}
                </span>
                {(incident.callerPhone || prof?.mobileNumber || userContact?.phone) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCallRecipient("Member");
                      setCallPhone(incident.callerPhone || prof?.mobileNumber || userContact?.phone || "");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-[#091329] hover:bg-[#162850] text-white font-bold transition-colors"
                  >
                    Dial / Log
                  </button>
                )}
              </div>
              {(prof?.alternateNumber || userContact?.alternatePhone) && (
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <span className="font-mono text-slate-700">
                    Alt Phone: {prof?.alternateNumber || userContact?.alternatePhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCallRecipient("Member (Alt)");
                      setCallPhone(prof?.alternateNumber || userContact?.alternatePhone || "");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
                  >
                    Dial / Log
                  </button>
                </div>
              )}
            </div>

            {/* Registered Address & Landmark */}
            <div className="space-y-1 text-xs">
              <div className="text-slate-500 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Registered Service Address:
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-800 leading-relaxed">
                {address}
              </div>
              {prof?.nearestLandmark && (
                <div className="text-[11px] text-[#B08A4A] font-medium">
                  Landmark: {prof.nearestLandmark}
                </div>
              )}
            </div>

            {/* Designated Emergency Hospital */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wide mb-1.5">
                <Building className="w-3.5 h-3.5" />
                Designated Emergency Hospital
              </div>
              <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-200 text-xs">
                <div className="font-bold text-red-950">
                  {prof?.medicalAuth?.hospitalForSos || "Nearest Tertiary Multi-specialty Hospital"}
                </div>
                {prof?.medicalAuth?.nomineeLocalContact && (
                  <div className="text-[11px] text-red-800 mt-1">
                    Nominee Local Contact: {prof.medicalAuth.nomineeLocalContact}
                  </div>
                )}
              </div>
            </div>

            {/* Medical Alerts & Conditions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#091329] uppercase tracking-wide">
                <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
                Medical Profile & Clinical Flags
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <span className="text-slate-500 block text-[10px]">Blood Group</span>
                  <span className="font-bold text-[#091329]">
                    {prof?.bloodGroup || "Not recorded"}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <span className="text-slate-500 block text-[10px]">Pre-existing Conditions</span>
                  <span className="font-semibold text-amber-700">
                    {prof?.medicalConditions ? "Conditions Logged" : "Standard"}
                  </span>
                </div>
              </div>
              {prof?.medicalConditions && (
                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
                  {prof.medicalConditions}
                </div>
              )}
            </div>

            {/* Emergency Contacts */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#091329] uppercase tracking-wide">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                Emergency Family Contacts
              </div>

              {/* Primary Contact */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#091329]">
                    {userContact?.fullName || prof?.sponsor?.fullName || "Primary Contact Not Recorded"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    {userContact?.relationship || prof?.sponsor?.relationship || "Primary"}
                  </span>
                </div>
                {(userContact?.phone || prof?.sponsor?.mobileNumber) && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-emerald-700 font-bold">
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
                      className="text-[10px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                    >
                      Log Call
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Contact */}
              {prof?.sponsor?.alternateNumber && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#091329]">
                      {prof.sponsor.fullName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                      Alt Contact
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-emerald-700 font-bold">
                      {prof.sponsor.alternateNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCallRecipient(`${prof?.sponsor?.fullName} (Alt)`);
                        setCallPhone(prof?.sponsor?.alternateNumber || "");
                      }}
                      className="text-[10px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                    >
                      Log Call
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION C: Emergency Location & Live GPS Telemetry */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#091329] flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-red-600 animate-pulse" />
                Emergency Location & Live GPS
              </h3>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wide ${
                  incident.trackingActive
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {incident.trackingActive ? "TRACKING ACTIVE" : "TRACKING TERMINATED"}
              </span>
            </div>

            {incident.currentLatitude && incident.currentLongitude ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1.5">
                  <div className="text-slate-600 flex justify-between">
                    <span>Latitude:</span>
                    <span className="text-[#091329] font-bold">
                      {incident.currentLatitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>Longitude:</span>
                    <span className="text-[#091329] font-bold">
                      {incident.currentLongitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>Accuracy:</span>
                    <span className="text-emerald-700 font-bold">
                      ±{Math.round(incident.locationAccuracy || 10)} meters
                    </span>
                  </div>
                  {incident.locationTimestamp && (
                    <div className="text-slate-500 text-[10px] flex justify-between pt-1 border-t border-slate-200">
                      <span>Last Timestamp:</span>
                      <span>{new Date(incident.locationTimestamp).toLocaleTimeString("en-IN")}</span>
                    </div>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps?q=${incident.currentLatitude},${incident.currentLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Live Coordinates in Google Maps
                </a>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  GPS Signal Pending / Fallback to Registered Address
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Direct field responder to registered primary address: {address}
                </p>
              </div>
            )}

            <div className="p-2.5 rounded bg-slate-50 text-[10px] text-slate-500 border border-slate-200 leading-tight">
              Privacy Safeguard: Location streaming is enabled only during active SOS triage. Resolving the incident immediately revokes GPS telemetry with HTTP 410.
            </div>
          </div>

          {/* SECTION D: Field Employee Dispatch */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-blue-700">
              <ShieldCheck className="w-4 h-4" />
              Field Employee Dispatch
            </div>

            {incident.assignedEmployee ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#091329] text-sm">
                      {incident.assignedEmployee.firstName}{" "}
                      {incident.assignedEmployee.lastName}
                    </span>
                    <span className="font-mono text-blue-800 font-bold">
                      {incident.assignedEmployee.employeeId}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Designation: {incident.assignedEmployee.designation}
                  </div>
                  {incident.assignedEmployee.contactNumber && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-blue-200/60">
                      <span className="font-mono text-[#091329] font-bold">
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
                        className="text-[10px] px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors"
                      >
                        Dial / Log Call
                      </button>
                    </div>
                  )}
                  {incident.dispatchedAt && (
                    <div className="text-[10px] text-slate-500">
                      Dispatched at:{" "}
                      {new Date(incident.dispatchedAt).toLocaleTimeString("en-IN")}
                    </div>
                  )}
                </div>

                {/* Record Arrival on Scene */}
                {incident.status === "DISPATCHED" && (
                  <button
                    type="button"
                    onClick={handleRecordArrival}
                    disabled={isPending}
                    className="w-full py-2.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Record Responder Arrival On Scene
                  </button>
                )}

                {incident.responderArrivedAt && (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      Responder arrived on scene at{" "}
                      {new Date(incident.responderArrivedAt).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            ) : !isResolved ? (
              <form onSubmit={handleDispatch} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Active Field Responder
                  </label>
                  <select
                    required
                    value={selectedResponderId}
                    onChange={(e) => setSelectedResponderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dispatch Instructions / Route Notes
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="e.g. Proceed with portable oxygen kit and vitals monitor"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || !selectedResponderId}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Responder
                </button>
              </form>
            ) : (
              <div className="text-xs text-slate-500">
                No responder dispatched prior to incident resolution.
              </div>
            )}
          </div>

          {/* SECTION F: Member Safety Confirmation */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <FileCheck className="w-4 h-4" />
              Member Safety Confirmation
            </div>

            {incident.safetyConfirmedAt ? (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  Safety Confirmed by {incident.safetyConfirmedBy}
                </div>
                <div className="text-emerald-950 leading-relaxed">
                  {incident.safetyNotes}
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Confirmed at:{" "}
                  {new Date(incident.safetyConfirmedAt).toLocaleTimeString("en-IN")}
                </div>
              </div>
            ) : !isResolved ? (
              <form onSubmit={handleConfirmSafety} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmed By (Responder / Doctor / Family Member)
                  </label>
                  <input
                    type="text"
                    required
                    value={safetyConfirmer}
                    onChange={(e) => setSafetyConfirmer(e.target.value)}
                    placeholder="e.g. Sagnik Kar (Field Caregiver) / Dr. Sen"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Safety Notes & Elder Condition
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={safetyNotesInput}
                    onChange={(e) => setSafetyNotesInput(e.target.value)}
                    placeholder="e.g. Vitals normal (BP 125/80, Pulse 74). Elder resting comfortably under family supervision."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
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

        {/* RIGHT COLUMN: Emergency Communications & Activity Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION E: Emergency Communications (Call Logger + Quick Notes Grouped) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#091329]">
              <Phone className="w-4 h-4 text-amber-500" />
              Emergency Communications
            </div>

            {/* Outbound Call Logger */}
            {!isResolved ? (
              <form onSubmit={handleLogCall} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Recipient
                    </label>
                    <select
                      value={callRecipient}
                      onChange={(e) => setCallRecipient(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white"
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
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={callPhone}
                      onChange={(e) => setCallPhone(e.target.value)}
                      placeholder="e.g. 9830012345"
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Call Outcome
                  </label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white"
                  >
                    <option value="ANSWERED">Answered (Spoke with recipient)</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="BUSY">Line Busy</option>
                    <option value="VOICEMAIL">Voicemail</option>
                    <option value="FAILED">Call Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Call Notes & Summary
                  </label>
                  <textarea
                    rows={2}
                    value={callDetails}
                    onChange={(e) => setCallDetails(e.target.value)}
                    placeholder="e.g. Inquired about breathing difficulty. Family stated ambulance is en route."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
                >
                  Save Call Record
                </button>
              </form>
            ) : (
              <div className="text-xs text-slate-500">
                Call logging closed upon incident resolution.
              </div>
            )}

            {/* Quick Operational Note Entry */}
            {!isResolved && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Quick Operational Note
                </label>
                <form onSubmit={handleAddQuickNote} className="flex gap-2">
                  <input
                    type="text"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="e.g. Police notified, PCR dispatched..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isPending || !quickNote.trim()}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-colors"
                  >
                    Post Note
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* SECTION G: Immutable Activity Timeline (Audit Trail) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#091329] flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                Immutable Activity Timeline
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                {incident.logs.length} logged events
              </span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
                        ? "bg-red-50/70 border-red-200 text-red-950"
                        : isDown
                        ? "bg-amber-50/70 border-amber-200 text-amber-950"
                        : isResolvedAction
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : isCall
                        ? "bg-blue-50/70 border-blue-200 text-blue-950"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="uppercase tracking-wider">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="leading-relaxed">{log.details}</div>

                    <div className="text-[10px] text-slate-500 pt-0.5">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-xl text-white">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-950 uppercase tracking-wider">
                  Supervisor Authorization Required
                </h3>
                <p className="text-xs text-red-700">
                  Strict Governance: Downgrading a CODE RED incident requires supervisor approval
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-950 leading-relaxed">
              You are proposing to downgrade incident{" "}
              <strong className="text-red-900">{incident.incidentNumber}</strong> to{" "}
              <strong className="text-red-900">
                {targetDowngradeClassification.replace("_", " ")}
              </strong>
              . This override is permanently stamped in the supervisor audit trail.
            </div>

            {downgradeError && (
              <div className="p-3 text-xs rounded-lg bg-red-100 border border-red-300 text-red-800 font-medium">
                {downgradeError}
              </div>
            )}

            {!isSupervisor ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Your current account does not hold supervisory credentials (
                  <code className="text-red-700 font-semibold">EMERGENCY_INCIDENT_SUPERVISE</code>).
                  Please contact the on-duty Emergency Supervisor to authorize this classification change.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDowngradeModal(false)}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmDowngrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supervisor Justification / Clinical Assessment *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={downgradeReason}
                    onChange={(e) => setDowngradeReason(e.target.value)}
                    placeholder="State reason: e.g. Contacted family; elder had accidental SOS press; verified fully conscious and vitals steady."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDowngradeModal(false)}
                    className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-xl text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#091329]">
                  Resolve Emergency Incident
                </h3>
                <p className="text-xs text-slate-500">
                  Complete incident closure & terminate location telemetry
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Closing this incident will set status to <strong>RESOLVED</strong> and immediately
              cut off GPS streaming (HTTP 410 Gone) in compliance with privacy protocols.
            </div>

            {resolveError && (
              <div className="p-3 text-xs rounded-lg bg-red-100 border border-red-300 text-red-800 font-medium">
                {resolveError}
              </div>
            )}

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Field responder attended scene. Attending doctor stabilized elder. Member safe in family care. Incident closed."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
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
