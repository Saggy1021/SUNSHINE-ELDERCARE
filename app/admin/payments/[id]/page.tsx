import { getPaymentById } from "@/app/actions/payment"
import PaymentVerificationActions from "@/components/yoga/admin/payment-verification-actions"
import PaymentResendButton from "@/components/yoga/admin/payment-resend-button"
import { db } from "@/lib/db"
import { ShieldCheck, Receipt, User, Clock, FileText, ArrowLeft, Mail, Download, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: paymentId } = await params;
  const payment = await getPaymentById(paymentId);

  if (!payment) {
    notFound();
  }

  // Retrieve email notification tracking for payment confirmation
  const emailNotification = await db.emailNotification.findFirst({
    where: {
      entityType: "Payment",
      entityId: payment.id,
      eventType: "PAYMENT_VERIFIED",
    },
    orderBy: { createdAt: "desc" },
  });

  // Retrieve current subscription status for this member
  const subscription = await db.subscription.findFirst({
    where: { userId: payment.userId },
    include: { carePlan: true },
    orderBy: { createdAt: "desc" },
  });

  const memberId = payment.user.memberProfile?.memberId || "UNASSIGNED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            title="Back to Payments"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Payment Details</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {payment.id}</p>
          </div>
        </div>
        {payment.status === "VERIFICATION_PENDING" && (
          <PaymentVerificationActions paymentId={payment.id} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Info */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#091329]" />
            Payment Information
          </h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount</p>
              <p className="font-bold text-[#091329] text-xl mt-1">₹{payment.amount.toString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                payment.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                payment.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                'bg-amber-50 text-amber-700 border border-amber-200/60'
              }`}>
                {payment.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-slate-500">Method</p>
              <p className="font-medium text-slate-900">{payment.paymentMethod}</p>
            </div>
            <div>
              <p className="text-slate-500">Reference / Proof</p>
              <p className="font-mono text-slate-900">{payment.reference || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Submitted At</p>
              <p className="font-medium text-slate-900">{payment.createdAt.toLocaleString('en-GB')}</p>
            </div>
            {payment.verifiedAt && (
              <div>
                <p className="text-slate-500">Verified At</p>
                <p className="font-medium text-slate-900">{payment.verifiedAt.toLocaleString('en-GB')}</p>
              </div>
            )}
            {payment.verifiedBy && (
              <div className="col-span-2">
                <p className="text-slate-500">Processed By</p>
                <p className="font-medium text-slate-900">{payment.verifiedBy.name} ({payment.verifiedBy.email})</p>
              </div>
            )}
            {payment.notes && (
              <div className="col-span-2">
                <p className="text-slate-500">Notes / Reason</p>
                <p className="font-medium text-slate-900 bg-slate-50 p-2 rounded border mt-1">{payment.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Member Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Member Information
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Member ID</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold mt-1 ${
                memberId !== "UNASSIGNED"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}>
                {memberId}
              </span>
            </div>
            <div>
              <p className="text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{payment.user.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{payment.user.email}</p>
            </div>
            {payment.user.memberProfile && (
              <>
                <div>
                  <p className="text-slate-500">Mobile</p>
                  <p className="font-medium text-slate-900">{payment.user.memberProfile.mobileNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Address</p>
                  <p className="font-medium text-slate-900">{payment.user.memberProfile.serviceAddress || "N/A"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Commercial Context & Receipts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Commercial Context & Financial Documents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* Invoice Target */}
            {payment.invoice && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-900">Invoice</h3>
                  <a
                    href={`/api/invoices/${payment.invoice.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </a>
                </div>
                <p><span className="text-slate-500">Ref:</span> {payment.invoice.referenceNumber}</p>
                <p><span className="text-slate-500">Invoice No:</span> {payment.invoice.invoiceNumber || "Pending"}</p>
                <p><span className="text-slate-500">Amount:</span> ₹{payment.invoice.total.toString()}</p>
                <p><span className="text-slate-500">Status:</span> {payment.invoice.status}</p>
              </div>
            )}

            {/* Money Receipt */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-900">Money Receipt</h3>
                {payment.receipt ? (
                  <a
                    href={`/api/receipts/${payment.receipt.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </a>
                ) : null}
              </div>
              {payment.receipt ? (
                <>
                  <p><span className="text-slate-500">Receipt No:</span> <span className="font-mono font-semibold">{payment.receipt.receiptNumber}</span></p>
                  <p><span className="text-slate-500">Date:</span> {payment.receipt.paymentDate.toLocaleDateString('en-GB')}</p>
                  <p><span className="text-slate-500">Amount:</span> ₹{payment.receipt.amount.toString()}</p>
                  <p><span className="text-slate-500">Reference:</span> {payment.receipt.paymentReference || "N/A"}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500 mt-2">Receipt generated automatically upon payment verification.</p>
              )}
            </div>

            {/* Membership Activation Status */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-2">Membership Status</h3>
              {subscription ? (
                <>
                  <p><span className="text-slate-500">Plan:</span> {subscription.carePlan?.name || "Care Plan"}</p>
                  <p><span className="text-slate-500">Status:</span> <span className="font-semibold text-emerald-700">{subscription.status}</span></p>
                  {subscription.startDate && (
                    <p><span className="text-slate-500">Start:</span> {subscription.startDate.toLocaleDateString('en-GB')}</p>
                  )}
                  {subscription.endDate && (
                    <p><span className="text-slate-500">End:</span> {subscription.endDate.toLocaleDateString('en-GB')}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">No active subscription recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Email Delivery & Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 md:col-span-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" />
              Confirmation Email & Receipt Delivery
            </h2>
            {payment.status === "VERIFIED" && (
              <PaymentResendButton paymentId={payment.id} />
            )}
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Delivery Status</p>
              <div className="mt-1">
                {emailNotification ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    emailNotification.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                    emailNotification.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                    'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}>
                    {emailNotification.status === 'SENT' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {emailNotification.status}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not queued yet</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Recipient</p>
              <p className="font-medium text-slate-900 mt-1">{emailNotification?.recipientEmail || payment.user.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Attempts</p>
              <p className="font-medium text-slate-900 mt-1">{emailNotification?.attemptCount ?? 0} attempt(s)</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Last Attempt</p>
              <p className="font-medium text-slate-900 mt-1">
                {emailNotification?.lastAttemptAt ? emailNotification.lastAttemptAt.toLocaleString('en-GB') : "N/A"}
              </p>
            </div>
            {emailNotification?.error && (
              <div className="col-span-4 p-2.5 bg-rose-50 border border-rose-100 rounded text-xs text-rose-700">
                <span className="font-semibold">Delivery Failure:</span> {emailNotification.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
