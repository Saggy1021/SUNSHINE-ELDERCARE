import { getPendingPayments } from "@/app/actions/payment"
import PaymentVerificationActions from "@/components/yoga/admin/payment-verification-actions"
import { ShieldCheck, Receipt } from "lucide-react"

export default async function AdminPaymentsPage() {
  const payments = await getPendingPayments()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#091329]" /> Payment Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and verify offline payment submissions and bank transfers.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Commercial Reference</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Payment Method / Ref</th>
                <th className="px-5 py-3.5">Submitted</th>
                <th className="px-5 py-3.5 text-right">Action</th>
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
                <tr key={payment.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{payment.user.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{payment.user.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs">
                      <Receipt className="h-3.5 w-3.5 text-slate-400" />
                      {payment.invoice?.invoiceNumber || payment.invoice?.referenceNumber || "N/A"}
                    </div>
                    {payment.renewalRequest && (
                      <p className="text-xs text-slate-500 mt-1">
                        {payment.renewalRequest.planName} · {payment.renewalRequest.durationMonths}m
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#091329]">
                    ₹{payment.amount.toString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900 text-xs">{payment.paymentMethod}</p>
                    {payment.reference && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Ref: {payment.reference}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {payment.createdAt.toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-5 py-3.5 flex justify-end gap-2 items-center">
                    <a
                      href={`/admin/payments/${payment.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs transition-colors"
                    >
                      View Details
                    </a>
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
