import { getNeedsAttentionQueue } from "@/app/actions/admin"
import Link from "next/link"
import { AlertCircle, ArrowRight, MessageSquare } from "lucide-react"

export function NeedsAttentionSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
        </div>
        <div className="h-5 w-14 bg-slate-200 rounded-full" />
      </div>
      <div className="p-6 flex-1 space-y-6">
        <div>
          <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
          <div className="h-12 bg-slate-100 rounded-lg" />
        </div>
        <div>
          <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
          <div className="h-12 bg-slate-100 rounded-lg" />
        </div>
        <div>
          <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
          <div className="h-12 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export async function NeedsAttentionWidget() {
  const queue = await getNeedsAttentionQueue();
  const totalActionItems =
    queue.pendingRenewals.length +
    queue.pendingPayments.length +
    queue.unresolvedFeedback.length +
    queue.newInquiries.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-900">Needs Attention</h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
          {totalActionItems} items
        </span>
      </div>

      <div className="p-6 flex-1 space-y-6">
        {/* Pending Renewals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Renewals ({queue.pendingRenewals.length})
            </h3>
            <Link href="/admin/renewals" className="text-xs text-[#B08A4A] hover:underline font-medium">
              View all
            </Link>
          </div>
          {queue.pendingRenewals.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
              No pending renewal requests.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {queue.pendingRenewals.map((req: any) => (
                <li
                  key={req.id}
                  className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{req.user.name || req.user.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {req.planName} · {req.durationMonths}m
                    </p>
                  </div>
                  <Link
                    href="/admin/renewals"
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    Review <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Payments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Payments ({queue.pendingPayments.length})
            </h3>
            <Link href="/admin/payments" className="text-xs text-[#B08A4A] hover:underline font-medium">
              View all
            </Link>
          </div>
          {queue.pendingPayments.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
              No pending payments.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {queue.pendingPayments.map((payment: any) => (
                <li
                  key={payment.id}
                  className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{payment.user.name || payment.user.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ₹{payment.amount?.toString()} · {payment.paymentMethod}
                    </p>
                  </div>
                  <Link
                    href="/admin/payments"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#091329] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    Review <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Unresolved Feedback */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unresolved Feedback ({queue.unresolvedFeedback.length})
            </h3>
            <Link href="/admin/feedback" className="text-xs text-[#B08A4A] hover:underline font-medium">
              View all
            </Link>
          </div>
          {queue.unresolvedFeedback.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
              No unresolved feedback.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {queue.unresolvedFeedback.map((fb: any) => (
                <li
                  key={fb.id}
                  className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-slate-900 text-sm truncate">{fb.user.name || fb.user.email}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{fb.message}</p>
                  </div>
                  <Link
                    href="/admin/feedback"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
                  >
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function InquiriesSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-12 bg-slate-200 rounded" />
      </div>
      <div className="h-16 bg-slate-100 rounded-lg" />
    </div>
  );
}

export async function InquiriesWidget() {
  const queue = await getNeedsAttentionQueue();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#091329]" /> New Inquiries ({queue.newInquiries.length})
        </h3>
        <Link href="/admin/inquiries" className="text-xs text-[#B08A4A] hover:underline font-medium">
          View all
        </Link>
      </div>
      {queue.newInquiries.length === 0 ? (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
          No new inquiries.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {queue.newInquiries.map((inq: any) => (
            <li
              key={inq.id}
              className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="min-w-0 pr-2">
                <p className="font-medium text-slate-900 text-sm truncate">{inq.fullName}</p>
                <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{inq.message}</p>
              </div>
              <Link
                href="/admin/inquiries"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors shrink-0"
              >
                View <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
