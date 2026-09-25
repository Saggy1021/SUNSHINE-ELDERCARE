import { getPendingPayments } from "@/app/actions/payment"
import PaymentVerificationActions from "@/components/yoga/admin/payment-verification-actions"
import { ShieldCheck, Receipt } from "lucide-react"

export default async function AdminPaymentsPage() {
  const payments = await getPendingPayments()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" /> Payment Verification
          </h1>
          <p className="text-slate-600 mt-1">Review and verify offline payment submissions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Commercial Reference</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment Method / Ref</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No pending payments found.
                  </td>
                </tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{payment.user.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{payment.user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-medium text-slate-900">
                      <Receipt className="h-4 w-4 text-slate-400" />
                      {payment.invoice?.invoiceNumber || "N/A"}
                    </div>
                    {payment.renewalRequest && (
                      <p className="text-xs text-slate-500 mt-1">
                        {payment.renewalRequest.planName} - {payment.renewalRequest.durationMonths}m
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ₹{payment.amount.toString()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{payment.paymentMethod}</p>
                    {payment.reference && (
                      <p className="text-xs text-slate-500 font-mono mt-1">Ref: {payment.reference}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {payment.createdAt.toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 flex justify-end">
                    <PaymentVerificationActions paymentId={payment.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
