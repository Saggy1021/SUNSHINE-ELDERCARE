"use client"

import { useState } from "react"
import { resendPaymentConfirmationEmailAction } from "@/app/actions/payment"
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

export default function PaymentResendButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleResend = async () => {
    if (!confirm("Are you sure you want to resend the payment confirmation email and PDF receipt to the member?")) {
      return
    }

    try {
      setLoading(true)
      setResult(null)
      const res = await resendPaymentConfirmationEmailAction(paymentId)
      setResult(res)
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Failed to resend confirmation email",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleResend}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sending..." : "Resend Confirmation Email"}
      </button>
      {result && (
        <div
          className={`flex items-center gap-1.5 text-xs font-medium p-2 rounded-lg border ${
            result.success
              ? "text-emerald-700 bg-emerald-50 border-emerald-200/60"
              : "text-rose-700 bg-rose-50 border-rose-200/60"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  )
}
