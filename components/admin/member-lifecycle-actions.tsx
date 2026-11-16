"use client"

import { useState } from "react"
import { Archive, RotateCcw, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, Loader2, X, Info } from "lucide-react"
import {
  adminArchiveMember,
  adminRestoreMember,
  checkMemberDeletionEligibility,
  requestMemberDeletionOtp,
  verifyMemberDeletionOtp,
  ownerApproveAndExecuteDeletion,
} from "@/app/actions/admin-member-lifecycle"
import { useRouter } from "next/navigation"

interface MemberLifecycleActionsProps {
  memberUserId: string
  memberName: string
  memberId: string | null
  status: string
  isOwner?: boolean
}

export function MemberLifecycleActions({
  memberUserId,
  memberName,
  memberId,
  status,
  isOwner = false,
}: MemberLifecycleActionsProps) {
  const router = useRouter()
  const isArchived = status === "ARCHIVED"

  // Modal open states
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Archive & Restore states
  const [archiveReason, setArchiveReason] = useState("")
  const [restoreReason, setRestoreReason] = useState("")
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  // Permanent Delete Multi-step states
  const [deleteStep, setDeleteStep] = useState<"checking" | "blocked" | "reason" | "otp" | "owner_approval" | "done">("checking")
  const [deleteReason, setDeleteReason] = useState("")
  const [otpInput, setOtpInput] = useState("")
  const [confirmedIdInput, setConfirmedIdInput] = useState("")
  const [dependencies, setDependencies] = useState<string[]>([])
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [eligibleNotice, setEligibleNotice] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [otpMessage, setOtpMessage] = useState<string | null>(null)

  // Open Delete Modal & check eligibility
  const handleOpenDelete = async () => {
    setDeleteModalOpen(true)
    setDeleteStep("checking")
    setDeleteError(null)
    setBlockedReason(null)
    setEligibleNotice(null)
    setOtpInput("")
    setConfirmedIdInput("")

    try {
      const res = await checkMemberDeletionEligibility(memberUserId)
      if (!res.eligible) {
        setDeleteStep("blocked")
        setDependencies(res.dependencies || [])
        setBlockedReason(res.reason || "Member cannot be permanently deleted.")
      } else {
        setEligibleNotice(res.eligibleNotice || null)
        setDeleteStep("reason")
      }
    } catch (err: any) {
      setDeleteStep("blocked")
      setBlockedReason(err?.message || "Failed to check deletion eligibility.")
    }
  }

  // Handle Archive Submission
  const handleArchive = async () => {
    if (!archiveReason.trim()) {
      setArchiveError("Please provide a reason for archiving this member.")
      return
    }

    setIsArchiving(true)
    setArchiveError(null)

    try {
      const res = await adminArchiveMember(memberUserId, archiveReason.trim())
      if (!res.success) {
        setArchiveError(res.error || "Failed to archive member.")
      } else {
        setArchiveModalOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      setArchiveError(err?.message || "An unexpected error occurred.")
    } finally {
      setIsArchiving(false)
    }
  }

  // Handle Restore Submission
  const handleRestore = async () => {
    setIsArchiving(true)
    setArchiveError(null)

    try {
      const res = await adminRestoreMember(memberUserId, restoreReason.trim() || undefined)
      if (!res.success) {
        setArchiveError(res.error || "Failed to restore member.")
      } else {
        setRestoreModalOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      setArchiveError(err?.message || "An unexpected error occurred.")
    } finally {
      setIsArchiving(false)
    }
  }

  // Handle Request Deletion OTP
  const handleRequestOtp = async () => {
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      setDeleteError("Please provide a detailed reason for permanent deletion (at least 5 characters).")
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await requestMemberDeletionOtp(memberUserId, deleteReason.trim())
      if (!res.success) {
        setDeleteError(res.error || "Failed to request verification code.")
        if (res.hasFinancialDependencies) {
          setDeleteStep("blocked")
          setBlockedReason(res.error || "Financial dependencies prevent permanent deletion.")
          setDependencies(res.dependencies || [])
        }
      } else {
        setOtpMessage(res.message || "A 6-digit verification code has been sent.")
        setDeleteStep("otp")
      }
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.includes("441") || msg.includes("Minified React error")) {
        setDeleteError("A server communication error occurred. Please try again or refresh.")
      } else {
        setDeleteError(msg || "Failed to dispatch verification code.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle Verify Deletion OTP & Confirm Member ID
  const handleVerifyOtp = async () => {
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setDeleteError("Please enter a valid 6-digit code.")
      return
    }
    if (!confirmedIdInput.trim()) {
      setDeleteError("You must type the exact Member ID to confirm permanent deletion.")
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await verifyMemberDeletionOtp(memberUserId, otpInput.trim(), confirmedIdInput.trim())
      if (!res.success) {
        setDeleteError(res.error || "Verification failed.")
      } else {
        setDeleteStep("owner_approval")
      }
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.includes("441") || msg.includes("Minified React error")) {
        setDeleteError("A server communication error occurred during verification. Please try again or refresh.")
      } else {
        setDeleteError(msg || "Verification failed.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle Owner Approval & Final Execution
  const handleOwnerApproveAndExecute = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await ownerApproveAndExecuteDeletion(memberUserId, deleteReason.trim())
      if (!res.success) {
        setDeleteError(res.error || "Failed to execute deletion.")
      } else {
        setDeleteStep("done")
        setTimeout(() => {
          router.push("/admin/members")
        }, 1500)
      }
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.includes("441") || msg.includes("Minified React error")) {
        setDeleteError("A server communication error occurred during execution. Please try again or refresh.")
      } else {
        setDeleteError(msg || "Execution failed.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Action Buttons in Page Header */}
      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        {isArchived ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200">
              <Archive className="h-3.5 w-3.5" /> Archived
            </span>
            <button
              onClick={() => {
                setArchiveError(null)
                setRestoreModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              title="Restore archived member to active listing"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore Member
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setArchiveReason("")
              setArchiveError(null)
              setArchiveModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            title="Archive this member (reversible)"
          >
            <Archive className="h-3.5 w-3.5" /> Archive Member
          </button>
        )}

        <button
          onClick={handleOpenDelete}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          title="Permanently delete member record (requires OTP & Owner approval)"
        >
          <Trash2 className="h-3.5 w-3.5" /> Permanent Delete
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ARCHIVE MEMBER MODAL                                                    */}
      {/* ========================================================================= */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                  <Archive className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Archive Member</h3>
              </div>
              <button
                onClick={() => setArchiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                You are archiving <strong>{memberName}</strong>{" "}
                <span className="font-mono text-slate-800 font-bold">({memberId || "UNASSIGNED"})</span>.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Reversible Operation
                </p>
                <p>
                  Archived members are hidden from the active members list. All profile details, Member ID,
                  subscriptions, payments, and invoices are <strong>100% preserved</strong> and can be restored at any time.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Archiving <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Relocated abroad, temporary suspension requested by family, inactive since..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50"
                />
              </div>

              {archiveError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {archiveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setArchiveModalOpen(false)}
                disabled={isArchiving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isArchiving || !archiveReason.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {isArchiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                Archive Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RESTORE MEMBER MODAL                                                    */}
      {/* ========================================================================= */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Restore Member</h3>
              </div>
              <button
                onClick={() => setRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Restore <strong>{memberName}</strong>{" "}
                <span className="font-mono text-slate-800 font-bold">({memberId || "UNASSIGNED"})</span> to active status?
              </p>
              <p>
                This member will immediately reappear in the active Members listing and dashboard operational metrics.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Restore Note (Optional)
                </label>
                <input
                  type="text"
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="e.g. Care subscription renewed, family requested reactivation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 bg-slate-50"
                />
              </div>

              {archiveError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {archiveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRestoreModalOpen(false)}
                disabled={isArchiving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={isArchiving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {isArchiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Restore to Active
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERMANENT DELETE MULTI-STEP MODAL                                      */}
      {/* ========================================================================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Permanent Member Deletion</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Target: {memberId || "UNASSIGNED"} · {memberName}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* STEP: CHECKING */}
            {deleteStep === "checking" && (
              <div className="py-8 flex flex-col items-center justify-center space-y-3 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
                <p className="text-xs font-medium">Checking financial and compliance dependencies...</p>
              </div>
            )}

            {/* STEP: BLOCKED BY FINANCIAL DEPENDENCIES (PHASE 4) */}
            {deleteStep === "blocked" && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Permanent Deletion Blocked
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    This member cannot be permanently deleted because they have legally binding financial and operational records:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-rose-950 font-medium space-y-0.5">
                    {dependencies.map((dep, idx) => (
                      <li key={idx}>{dep}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-rose-800 pt-1 border-t border-rose-200/60">
                    To maintain statutory financial accounting, GST records, and legal compliance, these records cannot be destroyed.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Recommended Solution: Archive Member</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Archiving will immediately hide this member from active listings while safely preserving all historical records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModalOpen(false)
                      setArchiveReason("Financial records present; archived in lieu of permanent deletion.")
                      setArchiveModalOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive Member Instead
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1: REASON & DISPATCH OTP */}
            {deleteStep === "reason" && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" /> Irreversible Action
                  </p>
                  <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                    {eligibleNotice || "Zero financial dependencies were found for this account. Permanent deletion will completely wipe this member's profile and user record."}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Required Deletion Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Provide justification for permanent deletion (minimum 5 characters)..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-slate-50"
                  />
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestOtp}
                    disabled={isDeleting || deleteReason.trim().length < 5}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Send Verification Code
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ENTER OTP & EXACT MEMBER ID CONFIRMATION */}
            {deleteStep === "otp" && (
              <div className="space-y-4 text-xs">
                {otpMessage && (
                  <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                    <p>{otpMessage}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Enter 6-Digit Verification Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-center font-mono text-lg tracking-widest font-bold bg-slate-50 focus:border-rose-500 focus:bg-white outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Check your registered administrator inbox. Code expires in 5 minutes.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Confirm Exact Member ID <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      Type <span className="font-mono font-bold text-slate-800">{memberId || "UNASSIGNED"}</span> exactly to confirm:
                    </p>
                    <input
                      type="text"
                      value={confirmedIdInput}
                      onChange={(e) => setConfirmedIdInput(e.target.value)}
                      placeholder={memberId || "UNASSIGNED"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs uppercase font-semibold bg-slate-50 focus:border-rose-500 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={handleRequestOtp}
                    disabled={isDeleting}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Resend Code
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteModalOpen(false)}
                      disabled={isDeleting}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyOtp}
                      disabled={isDeleting || otpInput.length !== 6 || !confirmedIdInput.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Verify & Proceed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: OWNER APPROVAL & FINAL EXECUTION */}
            {deleteStep === "owner_approval" && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Verification Successful</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      6-digit code and Member ID verified.
                    </p>
                  </div>
                </div>

                {isOwner ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-800">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      Primary Owner Final Authorization
                    </div>
                    <p className="text-xs leading-relaxed text-rose-950">
                      As the Primary Owner, clicking below will permanently delete <strong>{memberName}</strong> ({memberId || "UNASSIGNED"}).
                      This action cannot be undone.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                      <Info className="h-4 w-4 text-amber-600" />
                      Awaiting Primary Owner Approval
                    </div>
                    <p className="text-xs leading-relaxed text-amber-950">
                      Your deletion request and verification have been logged. In accordance with security protocol,
                      final deletion strictly requires authorization from the Primary Owner.
                    </p>
                  </div>
                )}

                {deleteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  {isOwner && (
                    <button
                      onClick={handleOwnerApproveAndExecute}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Approve & Permanently Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP: DONE */}
            {deleteStep === "done" && (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-emerald-700 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">Member Permanently Deleted</h4>
                <p className="text-xs text-slate-500">Redirecting to members listing...</p>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
