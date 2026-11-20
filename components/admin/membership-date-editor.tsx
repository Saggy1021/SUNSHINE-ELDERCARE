"use client"

import { useState } from "react"
import { CalendarDays, Clock, Edit2, Check, X, Loader2, RotateCcw } from "lucide-react"
import { updateMembershipDates } from "@/app/actions/admin"

interface MembershipDateEditorProps {
  subscriptionId: string
  currentStartDate: string | null
  currentEndDate: string | null
  durationMonths: number
  status: string
}

function calculateClientEndDateIso(startDateStr: string, durationMonths: number): string {
  if (!startDateStr || !durationMonths) return ""
  const parts = startDateStr.split("-").map(Number)
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return ""

  const year = parts[0]
  const month = parts[1] - 1 // 0-indexed
  const day = parts[2]

  const totalMonths = month + durationMonths
  const targetYear = year + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12

  // Month-end clamping
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, daysInTargetMonth)

  const d = new Date(Date.UTC(targetYear, targetMonth, targetDay))
  return d.toISOString().split("T")[0]
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function MembershipDateEditor({
  subscriptionId,
  currentStartDate,
  currentEndDate,
  durationMonths,
  status,
}: MembershipDateEditorProps) {
  const [isEditing, setIsEditing] = useState(false)

  const initialStartDateIso = currentStartDate
    ? new Date(currentStartDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  const defaultCalculatedIso = calculateClientEndDateIso(initialStartDateIso, durationMonths)

  const initialEndDateIso = currentEndDate
    ? new Date(currentEndDate).toISOString().split("T")[0]
    : defaultCalculatedIso

  const initialIsManual = Boolean(
    currentEndDate && initialEndDateIso !== defaultCalculatedIso
  )

  const [startDateInput, setStartDateInput] = useState(initialStartDateIso)
  const [endDateInput, setEndDateInput] = useState(initialEndDateIso)
  const [isManualEndDate, setIsManualEndDate] = useState(initialIsManual)

  const [displayedStart, setDisplayedStart] = useState(currentStartDate)
  const [displayedEnd, setDisplayedEnd] = useState(currentEndDate)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canEdit = status === "ACTIVE" || status === "PENDING" || status === "SCHEDULED"

  const handleStartDateChange = (newStart: string) => {
    setStartDateInput(newStart)
    if (!isManualEndDate && newStart) {
      const autoEnd = calculateClientEndDateIso(newStart, durationMonths)
      if (autoEnd) {
        setEndDateInput(autoEnd)
      }
    }
  }

  const handleEndDateChange = (newEnd: string) => {
    setEndDateInput(newEnd)
    const autoEnd = calculateClientEndDateIso(startDateInput, durationMonths)
    setIsManualEndDate(newEnd !== autoEnd)
  }

  const handleResetToCalculated = () => {
    const autoEnd = calculateClientEndDateIso(startDateInput, durationMonths)
    if (autoEnd) {
      setEndDateInput(autoEnd)
      setIsManualEndDate(false)
      setError(null)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (!startDateInput) {
      setError("A valid start date is required.")
      return
    }

    if (!endDateInput) {
      setError("A valid end date is required.")
      return
    }

    const startDateObj = new Date(startDateInput)
    const endDateObj = new Date(endDateInput)

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      setError("Please provide valid dates.")
      return
    }

    if (endDateObj <= startDateObj) {
      setError("Membership end date must be later than start date.")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await updateMembershipDates(
        subscriptionId,
        startDateInput,
        endDateInput
      )
      if (!res.success) {
        setError(res.error || "Failed to update membership dates.")
      } else {
        setDisplayedStart(res.startDate ? new Date(res.startDate).toISOString() : null)
        setDisplayedEnd(res.endDate ? new Date(res.endDate).toISOString() : null)
        setSuccess("Membership dates updated successfully.")
        setIsEditing(false)
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayedCalculatedIso = calculateClientEndDateIso(
    displayedStart ? new Date(displayedStart).toISOString().split("T")[0] : "",
    durationMonths
  )
  const isCurrentlyExtended = Boolean(
    displayedEnd &&
    displayedCalculatedIso &&
    new Date(displayedEnd).toISOString().split("T")[0] !== displayedCalculatedIso
  )

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {!isEditing ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              <span>Start: {formatDateDisplay(displayedStart)}</span>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>End: {formatDateDisplay(displayedEnd)}</span>
              {isCurrentlyExtended && (
                <span className="ml-1 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                  Adjusted
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true)
                setError(null)
                setSuccess(null)
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-2 py-1 rounded transition-colors self-start sm:self-auto cursor-pointer"
              title="Edit Membership Dates"
            >
              <Edit2 className="h-3 w-3" /> Edit Dates
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 bg-white p-3.5 rounded-lg border border-indigo-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Edit Membership Period
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setError(null)
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Duration
              </label>
              <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                {durationMonths} Month{durationMonths > 1 ? "s" : ""}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-600">
                  End Date *
                </label>
                {isManualEndDate ? (
                  <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1 rounded">
                    Adjusted
                  </span>
                ) : (
                  <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-100 px-1 rounded">
                    Auto
                  </span>
                )}
              </div>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={startDateInput}
                className={`w-full rounded border ${
                  isManualEndDate ? "border-amber-400 bg-amber-50/20" : "border-slate-300 bg-white"
                } px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600`}
              />
            </div>
          </div>

          {isManualEndDate && (
            <div className="flex items-center justify-between text-[11px] bg-amber-50/70 border border-amber-200/80 rounded px-2.5 py-1.5 text-amber-800">
              <span>End date manually modified from calculated duration ({durationMonths}m).</span>
              <button
                type="button"
                onClick={handleResetToCalculated}
                className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset to Calculated Date
              </button>
            </div>
          )}

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setError(null)
              }}
              disabled={isSubmitting}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#091329] hover:bg-[#162850] rounded shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" /> Save Date Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {success && (
        <p className="text-xs text-emerald-600 font-medium mt-1.5">{success}</p>
      )}
    </div>
  )
}
