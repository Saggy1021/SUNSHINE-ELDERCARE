"use client"

import { useState } from "react"
import { verifyPayment, rejectPayment } from "@/app/actions/admin"
import { CheckCircle, XCircle } from "lucide-react"

export default function PaymentVerificationActions({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleVerify = async () => {
    if (!confirm("Are you sure you want to verify this payment? This will activate the corresponding subscription.")) return
    
    try {
      setLoading(true)
      await verifyPayment(paymentId)
    } catch (err: any) {
      setError(err.message || "Failed to verify payment")
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt("Reason for rejection:")
    if (!reason) return
    
    try {
      setLoading(true)
      await rejectPayment(paymentId, reason)
    } catch (err: any) {
      setError(err.message || "Failed to reject payment")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button
          onClick={handleVerify}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" /> Verify
        </button>
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
}
