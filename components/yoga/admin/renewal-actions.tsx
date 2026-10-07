"use client"

import { useState } from "react"
import { approveRenewalRequest, rejectRenewalRequest } from "@/app/actions/admin"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function RenewalActions({ requestId, status, requestType }: { requestId: string, status: string, requestType: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status !== "PAID_PENDING_APPROVAL") {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide
        ${status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 
          status === 'REJECTED' ? 'bg-red-500/10 text-red-600' :
          status === 'REJECTED_REFUND_DUE' ? 'bg-red-700/10 text-red-800' :
          status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 text-amber-600' :
          status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600' :
          'bg-slate-500/10 text-slate-600'}`}
      >
        {status}
      </span>
    )
  }

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this membership? This will activate the subscription.")) return
    try {
      setLoading(true)
      setError(null)
      const formData = new FormData()
      formData.append("requestId", requestId)
      await approveRenewalRequest(formData)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this request?")) return
    try {
      setLoading(true)
      setError(null)
      await rejectRenewalRequest(requestId)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</div>
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button 
        onClick={handleApprove}
        className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
      >
        <CheckCircle2 className="h-4 w-4" /> Approve
      </button>
      <button 
        onClick={handleReject}
        className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
      >
        <XCircle className="h-4 w-4" /> Reject
      </button>
    </div>
  )
}
