"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// --- Authorization Helper ---
async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized access. Admin role required.")
  }
  return session.user.id
}

// --- Audit Logger ---
async function logAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: any) {
  await db.auditLog.create({
    data: {
      actorUserId: actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || {}
    }
  })
}

// --- Dashboard & Metrics ---
export async function getAdminDashboardMetrics() {
  await requireAdmin()

  const [
    totalMembers,
    activeMembers,
    pendingRenewals,
    scheduledMemberships,
    expiringMemberships,
    expiredMemberships,
    newInquiries,
    unresolvedFeedback,
    pendingPayments
  ] = await Promise.all([
    db.user.count(),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.renewalRequest.count({ where: { status: "SUBMITTED" } }),
    db.subscription.count({ where: { status: "SCHEDULED" } }),
    db.subscription.count({ where: { status: "EXPIRING" } }),
    db.subscription.count({ where: { status: "EXPIRED" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.feedback.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.payment.count({ where: { status: "VERIFICATION_PENDING" } })
  ])

  return {
    totalMembers,
    activeMembers,
    pendingRenewals,
    scheduledMemberships,
    expiringMemberships,
    expiredMemberships,
    newInquiries,
    unresolvedFeedback,
    pendingPayments
  }
}

export async function getNeedsAttentionQueue() {
  await requireAdmin()

  const pendingRenewals = await db.renewalRequest.findMany({
    where: { status: "SUBMITTED" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
    take: 5
  })

  const newInquiries = await db.inquiry.findMany({
    where: { status: "NEW" },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const unresolvedFeedback = await db.feedback.findMany({
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const pendingPayments = await db.payment.findMany({
    where: { status: "VERIFICATION_PENDING" },
    include: { user: { select: { name: true, email: true } }, invoice: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  return { pendingRenewals, newInquiries, unresolvedFeedback, pendingPayments }
}

// --- Members ---
export async function getMembers() {
  await requireAdmin()
  
  return db.user.findMany({
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getMemberDetails(userId: string) {
  await requireAdmin()

  return db.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        include: { carePlan: true, addOns: { include: { addOn: true } } },
        orderBy: { createdAt: 'desc' }
      },
      renewalRequests: {
        orderBy: { createdAt: 'desc' }
      },
      emergencyContact: true,
      feedback: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

// --- Renewal Requests ---
export async function getRenewalRequests() {
  await requireAdmin()

  return db.renewalRequest.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function approveRenewalRequest(requestId: string) {
  const adminId = await requireAdmin()

  const request = await db.renewalRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new Error("Renewal request not found")
  if (request.status !== "SUBMITTED") throw new Error("Can only approve SUBMITTED requests")

  // Transition RenewalRequest to APPROVED
  await db.renewalRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" }
  })

  // IMPORTANT: Do NOT touch the existing Subscription or simulate payment.
  // Phase 9 strictly sets the boundary here. Phase 10 will handle payment -> activation.

  await logAudit(adminId, "RENEWAL_APPROVED", "RenewalRequest", requestId, { 
    planName: request.planName, 
    variant: request.variantType 
  })
  
  revalidatePath('/admin/renewals')
}

export async function rejectRenewalRequest(requestId: string) {
  const adminId = await requireAdmin()

  const request = await db.renewalRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new Error("Renewal request not found")
  if (request.status !== "SUBMITTED") throw new Error("Can only reject SUBMITTED requests")

  await db.renewalRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" }
  })

  await logAudit(adminId, "RENEWAL_REJECTED", "RenewalRequest", requestId)
  
  revalidatePath('/admin/renewals')
}

// --- Inquiries ---
export async function getInquiries() {
  await requireAdmin()
  return db.inquiry.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function updateInquiryStatus(id: string, status: string) {
  const adminId = await requireAdmin()
  await db.inquiry.update({ where: { id }, data: { status } })
  await logAudit(adminId, "INQUIRY_STATUS_CHANGED", "Inquiry", id, { status })
  revalidatePath('/admin/inquiries')
}

// --- Feedback ---
export async function getFeedback() {
  await requireAdmin()
  return db.feedback.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateFeedbackStatus(id: string, status: string) {
  const adminId = await requireAdmin()
  await db.feedback.update({ where: { id }, data: { status } })
  await logAudit(adminId, "FEEDBACK_STATUS_CHANGED", "Feedback", id, { status })
  revalidatePath('/admin/feedback')
}

// --- Add-Ons ---
export async function getAddOns() {
  await requireAdmin()
  return db.addOn.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function toggleAddOnStatus(id: string, active: boolean) {
  const adminId = await requireAdmin()
  await db.addOn.update({ where: { id }, data: { active } })
  await logAudit(adminId, "ADDON_STATUS_CHANGED", "AddOn", id, { active })
  revalidatePath('/admin/add-ons')
}

// --- Audit Log ---
export async function getAuditLogs() {
  await requireAdmin()
  return db.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

import { adminVerifyPayment, adminRejectPayment } from "@/lib/services/payment"

export async function verifyPayment(paymentId: string) {
  const adminId = await requireAdmin()
  await adminVerifyPayment(paymentId, adminId)
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
}

export async function rejectPayment(paymentId: string, reason: string) {
  const adminId = await requireAdmin()
  await adminRejectPayment(paymentId, adminId, reason)
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
}
