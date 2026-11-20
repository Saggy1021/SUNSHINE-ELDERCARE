"use client";

import React, { useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  Save,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  User,
  Phone,
  FileText,
  Search,
  Filter,
  Send,
  XCircle,
  HelpCircle,
  Check,
} from "lucide-react";

// List of built-in templates
const BUILT_IN_TEMPLATES = [
  { code: "RENEWAL_SUBMITTED", name: "Renewal Submitted (Member)", defaultSubject: "Your Renewal Request is Submitted" },
  { code: "ADMIN_NEW_RENEWAL", name: "New Renewal (Admin)", defaultSubject: "New Renewal Request" },
  { code: "RENEWAL_APPROVED", name: "Renewal Approved", defaultSubject: "Your Renewal is Approved" },
  { code: "RENEWAL_REJECTED", name: "Renewal Rejected", defaultSubject: "Update on Your Renewal Request" },
  { code: "PAYMENT_SUBMITTED", name: "Payment Submitted (Member)", defaultSubject: "Payment Received - Pending Verification" },
  { code: "ADMIN_PAYMENT_SUBMITTED", name: "New Payment (Admin)", defaultSubject: "New Payment Submitted" },
  { code: "PAYMENT_VERIFIED", name: "Payment Verified", defaultSubject: "Payment Verified Successfully" },
  { code: "MEMBERSHIP_ACTIVATED", name: "Membership Activated", defaultSubject: "Your Membership is Active" },
  { code: "MEMBERSHIP_SCHEDULED", name: "Membership Scheduled", defaultSubject: "Your Membership is Scheduled" },
  { code: "PAYMENT_REJECTED", name: "Payment Rejected", defaultSubject: "Update on Your Payment" },
  { code: "ADMIN_INQUIRY_RECEIVED", name: "New Inquiry (Admin)", defaultSubject: "New Website Inquiry" },
];

interface ComplaintItem {
  id: string;
  complaintNumber: string;
  userId: string;
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  category: string;
  subject: string;
  description: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED";
  adminResponse: string | null;
  internalNotes: string | null;
  assignedTo: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string | null;
  };
}

interface ComplaintMetrics {
  totalCount: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;
}

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<"complaints" | "templates">("complaints");

  // Complaints State
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [complaintMetrics, setComplaintMetrics] = useState<ComplaintMetrics>({
    totalCount: 0,
    newCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
  });
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>("ALL");
  const [complaintSearch, setComplaintSearch] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [savingComplaint, setSavingComplaint] = useState(false);

  // Review Form State
  const [reviewForm, setReviewForm] = useState({
    status: "NEW" as "NEW" | "IN_PROGRESS" | "RESOLVED",
    adminResponse: "",
    internalNotes: "",
    assignedTo: "",
  });

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [templateFormData, setTemplateFormData] = useState({
    subject: "",
    body: "",
    isActive: true,
    description: "",
  });

  const fetchComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const res = await fetch(`/api/admin/communications/complaints?status=${complaintStatusFilter}`);
      const data = await res.json();
      if (res.ok && data.complaints) {
        setComplaints(data.complaints);
        if (data.metrics) {
          setComplaintMetrics(data.metrics);
        }
      }
    } catch (e) {
      console.error("Failed to load complaints", e);
    } finally {
      setComplaintsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/communications/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [complaintStatusFilter]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openReviewModal = (cmp: ComplaintItem) => {
    setSelectedComplaint(cmp);
    setReviewForm({
      status: cmp.status,
      adminResponse: cmp.adminResponse || "",
      internalNotes: cmp.internalNotes || "",
      assignedTo: cmp.assignedTo || "",
    });
    setReviewModalOpen(true);
  };

  const handleSaveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSavingComplaint(true);

    try {
      const res = await fetch(`/api/admin/communications/complaints/${selectedComplaint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });

      const data = await res.json();
      if (res.ok) {
        setReviewModalOpen(false);
        fetchComplaints();
      } else {
        alert(data.error || "Failed to update complaint");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setSavingComplaint(false);
    }
  };

  const handleSelectTemplate = (code: string) => {
    setSelectedCode(code);
    const existing = templates.find((t) => t.code === code);
    if (existing) {
      setTemplateFormData({
        subject: existing.subject,
        body: existing.body,
        isActive: existing.isActive,
        description: existing.description || "",
      });
    } else {
      const builtIn = BUILT_IN_TEMPLATES.find((t) => t.code === code);
      setTemplateFormData({
        subject: builtIn?.defaultSubject || "",
        body: "Hello {{memberName}},\n\nHere is your message...",
        isActive: true,
        description: "",
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedCode) return;
    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/communications/templates/${selectedCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateFormData),
      });

      if (res.ok) {
        alert("Template saved successfully");
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || "Error saving template");
      }
    } catch {
      alert("Error saving template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!complaintSearch.trim()) return true;
    const q = complaintSearch.toLowerCase();
    return (
      c.complaintNumber.toLowerCase().includes(q) ||
      c.memberName.toLowerCase().includes(q) ||
      c.memberId.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Communications</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#B08A4A]" />
            Communications & Member Redressal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage incoming member complaints, care inquiries, and automated email notification templates.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-muted/40 rounded-xl border border-border/60">
          <button
            onClick={() => setActiveTab("complaints")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "complaints"
                ? "bg-[#091329] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#B08A4A]" />
            Member Complaints ({complaintMetrics.newCount} New)
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "templates"
                ? "bg-[#091329] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#B08A4A]" />
            Email Templates
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: MEMBER COMPLAINTS & REDRESSAL                         */}
      {/* ============================================================ */}
      {activeTab === "complaints" && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Complaints
              </span>
              <div className="text-2xl font-black text-[#091329] dark:text-white mt-1">
                {complaintMetrics.totalCount}
              </div>
            </div>
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                New / Unreviewed
              </span>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {complaintMetrics.newCount}
              </div>
            </div>
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                In Progress
              </span>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {complaintMetrics.inProgressCount}
              </div>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Resolved
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {complaintMetrics.resolvedCount}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                placeholder="Search by ticket #, member name, or subject..."
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
              {["ALL", "NEW", "IN_PROGRESS", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setComplaintStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    complaintStatusFilter === st
                      ? "bg-[#091329] text-white"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Complaints List / Table */}
          {complaintsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#B08A4A]" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border/60 rounded-2xl p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-40 mb-3" />
              <h3 className="text-base font-bold text-[#091329] dark:text-white">
                No Complaints in Queue
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {complaintSearch
                  ? "No member complaints matched your search filter."
                  : "All member complaints and issues are currently resolved. Incoming submissions from the Member App will appear here in real time."}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="divide-y divide-border/60">
                {filteredComplaints.map((c) => {
                  const isNew = c.status === "NEW";
                  const isInProgress = c.status === "IN_PROGRESS";
                  const isResolved = c.status === "RESOLVED";

                  const formattedDate = new Date(c.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <div
                      key={c.id}
                      className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#091329] text-white">
                            {c.complaintNumber}
                          </span>
                          <span className="text-xs font-bold text-[#091329] dark:text-white">
                            {c.memberName}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {c.memberId}
                          </span>
                          <span className="text-[11px] font-semibold text-[#B08A4A] bg-[#B08A4A]/10 px-2 py-0.5 rounded-full">
                            {c.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            • {formattedDate}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[#091329] dark:text-white">
                            {c.subject}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {c.description}
                          </p>
                        </div>

                        {c.adminResponse && (
                          <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2.5 flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-bold">Official Resolution Note: </span>
                              <span>{c.adminResponse}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Status & Action */}
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                            isNew
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : isInProgress
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {c.status.replace("_", " ")}
                        </span>

                        <button
                          onClick={() => openReviewModal(c)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white transition-all shadow-sm"
                        >
                          Review & Respond
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPLAINT REVIEW & RESOLUTION MODAL */}
          {reviewModalOpen && selectedComplaint && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
                <div className="p-5 border-b border-border/60 flex items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#091329] text-white">
                      <MessageSquare className="w-5 h-5 text-[#B08A4A]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#091329] dark:text-white flex items-center gap-2">
                        <span>Ticket {selectedComplaint.complaintNumber}</span>
                        <span className="text-xs px-2 py-0.5 font-normal rounded bg-muted text-muted-foreground">
                          {selectedComplaint.category}
                        </span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Review member concern, assign resolution ownership, and record response.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveComplaint}>
                  <div className="p-6 space-y-5">
                    {/* Member Information Box */}
                    <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground font-medium block">Member Name</span>
                        <span className="font-bold text-[#091329] dark:text-white">
                          {selectedComplaint.memberName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block">Member ID</span>
                        <span className="font-mono font-bold text-[#091329] dark:text-white">
                          {selectedComplaint.memberId}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block">Phone / Mobile</span>
                        <span className="font-semibold text-slate-700">
                          {selectedComplaint.memberPhone || "Not provided"}
                        </span>
                      </div>
                    </div>

                    {/* Complaint Details */}
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Subject & Observation
                      </span>
                      <div className="p-4 bg-background border border-border/80 rounded-xl space-y-1.5">
                        <h4 className="text-sm font-bold text-[#091329] dark:text-white">
                          {selectedComplaint.subject}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {selectedComplaint.description}
                        </p>
                      </div>
                    </div>

                    {/* Status & Assignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Resolution Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={reviewForm.status}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, status: e.target.value as any })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                        >
                          <option value="NEW">New (Awaiting Review)</option>
                          <option value="IN_PROGRESS">In Progress (Under Investigation)</option>
                          <option value="RESOLVED">Resolved (Completed)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Assigned Officer / Coordinator
                        </label>
                        <input
                          type="text"
                          value={reviewForm.assignedTo}
                          onChange={(e) => setReviewForm({ ...reviewForm, assignedTo: e.target.value })}
                          placeholder="e.g. Care Operations Lead"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                        />
                      </div>
                    </div>

                    {/* Member-Facing Response */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                        <span>Official Response to Member</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          (Visible in Member App)
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={reviewForm.adminResponse}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, adminResponse: e.target.value })
                        }
                        placeholder="e.g. We have reviewed your request and our care coordinator has verified the service timing. A replacement visit has been scheduled."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-300 dark:border-emerald-800 bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        This message will be rendered directly inside the member's mobile app under their ticket resolution history.
                      </p>
                    </div>

                    {/* Internal Admin Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <span>Internal Admin Notes</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          (Private to Administrators)
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        value={reviewForm.internalNotes}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, internalNotes: e.target.value })
                        }
                        placeholder="Internal notes, employee follow-ups, or verification details..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg border border-border/80 hover:bg-muted text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingComplaint}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-all"
                    >
                      {savingComplaint && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Resolution
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: AUTOMATED EMAIL TEMPLATES (PRESERVED)                */}
      {/* ============================================================ */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/40 bg-muted/20">
                <h3 className="text-sm font-semibold text-[#091329] dark:text-white">
                  Template Library
                </h3>
              </div>
              <div className="p-0">
                <div className="divide-y divide-border/40">
                  {BUILT_IN_TEMPLATES.map((bt) => {
                    const isOverridden = templates.some((t) => t.code === bt.code && t.isActive);
                    return (
                      <button
                        key={bt.code}
                        onClick={() => handleSelectTemplate(bt.code)}
                        className={`w-full text-left p-3.5 hover:bg-muted/50 transition-colors flex items-center justify-between ${
                          selectedCode === bt.code
                            ? "bg-amber-500/10 border-l-4 border-[#B08A4A]"
                            : ""
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">{bt.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {bt.code}
                          </div>
                        </div>
                        {isOverridden ? (
                          <span className="text-[10px] font-semibold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            CUSTOM
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">
                            DEFAULT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            {selectedCode ? (
              <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#091329] dark:text-white">
                        Edit Template
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {BUILT_IN_TEMPLATES.find((t) => t.code === selectedCode)?.name} (
                        <span className="font-mono">{selectedCode}</span>)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label
                        htmlFor="isActive"
                        className="text-xs font-medium text-foreground cursor-pointer"
                      >
                        Use Custom Template
                      </label>
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={templateFormData.isActive}
                        onChange={(e) =>
                          setTemplateFormData({ ...templateFormData, isActive: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-[#091329] accent-[#091329] focus:ring-[#091329]"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {!templateFormData.isActive && (
                    <div className="bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 p-3.5 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h4 className="text-xs font-semibold">System Default Active</h4>
                        <p className="text-xs mt-0.5 opacity-90">
                          This custom template is currently disabled. The system will fall back to
                          the hardcoded default template.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Email Subject</label>
                    <input
                      value={templateFormData.subject}
                      onChange={(e) =>
                        setTemplateFormData({ ...templateFormData, subject: e.target.value })
                      }
                      placeholder="Enter email subject"
                      disabled={!templateFormData.isActive}
                      className="flex h-9 w-full rounded-md border border-border/60 bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Email Body (HTML/Text)
                    </label>
                    <textarea
                      value={templateFormData.body}
                      onChange={(e) =>
                        setTemplateFormData({ ...templateFormData, body: e.target.value })
                      }
                      placeholder="Enter email content..."
                      className="flex w-full rounded-md border border-border/60 bg-background p-3 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 min-h-[300px] font-mono text-xs leading-relaxed"
                      disabled={!templateFormData.isActive}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Use{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-primary">
                        {"{{propertyName}}"}
                      </code>{" "}
                      for dynamic variables (e.g.,{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-primary">
                        {"{{memberName}}"}
                      </code>
                      ,{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-primary">
                        {"{{planName}}"}
                      </code>
                      ). The content is automatically wrapped in the Sunshine Eldercare layout.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !templateFormData.isActive}
                      className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#091329] text-white hover:bg-[#091329]/90 h-9 px-4 py-2 shadow-sm"
                    >
                      {savingTemplate ? (
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-2" />
                      )}
                      Save Template
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed border-border/60 rounded-lg bg-card/50">
                <Mail className="w-10 h-10 mb-3 text-muted-foreground/60" />
                <p className="text-sm">Select a template from the library to edit.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
