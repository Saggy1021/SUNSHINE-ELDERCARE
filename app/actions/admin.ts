"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { notificationService } from "@/lib/services/notification"
import { AuthorizationService } from "@/lib/services/authorization"
import { RateLimitService } from "@/lib/services/rate-limit"

// --- Authorization Helper ---
async function requirePermission(permission: string) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  await AuthorizationService.require(session.user.id, permission)
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
  await requirePermission("MEMBER_VIEW") // Any basic admin view permission

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
  await requirePermission("MEMBER_VIEW")

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
  await requirePermission("MEMBER_VIEW")
  
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
  const sessionUser = await requirePermission("MEMBER_VIEW")

  // Check if they have sensitive view
  const hasSensitiveView = await AuthorizationService.can(sessionUser, "MEMBER_SENSITIVE_VIEW");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberProfile: {
        include: {
          sponsor: true,
          insuranceDetails: true,
          medicalAuth: true,
        }
      },
      subscriptions: {
        include: { carePlan: true, addOns: { include: { addOn: true } }, customPlan: true },
        orderBy: { createdAt: 'desc' }
      },
      renewalRequests: {
        orderBy: { createdAt: 'desc' }
      },
      emergencyContact: true,
      feedback: {
        orderBy: { createdAt: 'desc' }
      },

      invoices: {
        where: { invoiceNumber: { not: null } },
        orderBy: { issueDate: 'desc' }
      },
      receipts: {
        orderBy: { createdAt: 'desc' }
      },
      payments: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  let auditLogs: any[] = []
  if (user) {
    auditLogs = await db.auditLog.findMany({
      where: {
        OR: [
          { actorUserId: userId },
          { entityId: userId, entityType: 'USER' },
          { entityId: user.memberProfile?.id, entityType: 'MEMBER_PROFILE' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  }

  if (user && !hasSensitiveView) {
    if (user.memberProfile) {
      user.memberProfile.idProofNumber = null;
    }
    if (user.memberProfile?.insuranceDetails) {
      user.memberProfile.insuranceDetails.policyNumber = "HIDDEN";
      user.memberProfile.insuranceDetails.coverageAmount = "HIDDEN";
    }
    if (user.memberProfile?.medicalAuth) {
      user.memberProfile.medicalAuth.hospitalForSos = "HIDDEN";
    }
    if (user.emergencyContact) {
      user.emergencyContact.phone = "HIDDEN";
      user.emergencyContact.alternatePhone = "HIDDEN";
    }
  }

  return { ...user, auditLogs };
}

// --- Renewal Requests ---
export async function getRenewalRequests() {
  await requirePermission("RENEWAL_VIEW")

  return db.renewalRequest.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function approveRenewalRequest(requestId: string) {
  const adminId = await requirePermission("RENEWAL_APPROVE")

  const request = await db.renewalRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new Error("Renewal request not found")
  if (request.status !== "SUBMITTED") throw new Error("Can only approve SUBMITTED requests")

  // Transition RenewalRequest to APPROVED
  await db.renewalRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" }
  })

  await logAudit(adminId, "RENEWAL_APPROVED", "RenewalRequest", requestId, { 
    planName: request.planName, 
    variant: request.variantType 
  })
  
  revalidatePath('/admin/renewals')
  notificationService.onRenewalApproved(request).catch(() => {})
}

export async function rejectRenewalRequest(requestId: string) {
  const adminId = await requirePermission("RENEWAL_APPROVE")

  const request = await db.renewalRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new Error("Renewal request not found")
  if (request.status !== "SUBMITTED") throw new Error("Can only reject SUBMITTED requests")

  await db.renewalRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" }
  })

  await logAudit(adminId, "RENEWAL_REJECTED", "RenewalRequest", requestId)
  
  revalidatePath('/admin/renewals')
  notificationService.onRenewalRejected(request).catch(() => {})
}

// --- Inquiries ---
export async function getInquiries() {
  await requirePermission("INQUIRY_VIEW")
  return db.inquiry.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function updateInquiryStatus(id: string, status: string) {
  const adminId = await requirePermission("INQUIRY_MANAGE")
  await db.inquiry.update({ where: { id }, data: { status } })
  await logAudit(adminId, "INQUIRY_STATUS_CHANGED", "Inquiry", id, { status })
  revalidatePath('/admin/inquiries')
}

// --- Feedback ---
export async function getFeedback() {
  await requirePermission("FEEDBACK_VIEW")
  return db.feedback.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateFeedbackStatus(id: string, status: string) {
  const adminId = await requirePermission("FEEDBACK_MANAGE")
  await db.feedback.update({ where: { id }, data: { status } })
  await logAudit(adminId, "FEEDBACK_STATUS_CHANGED", "Feedback", id, { status })
  revalidatePath('/admin/feedback')
}

// --- Add-Ons ---
export async function getAddOns() {
  await requirePermission("PLAN_VIEW")
  return db.addOn.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function toggleAddOnStatus(id: string, active: boolean) {
  const adminId = await requirePermission("PLAN_MANAGE")
  await db.addOn.update({ where: { id }, data: { active } })
  await logAudit(adminId, "ADDON_STATUS_CHANGED", "AddOn", id, { active })
  revalidatePath('/admin/add-ons')
}

// --- Audit Log ---
export async function getAuditLogs() {
  await requirePermission("AUDIT_VIEW")
  return db.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

import { adminVerifyPayment, adminRejectPayment } from "@/lib/services/payment"

export async function verifyPayment(paymentId: string) {
  const adminId = await requirePermission("PAYMENT_VERIFY")
  await adminVerifyPayment(paymentId, adminId)
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
}

export async function rejectPayment(paymentId: string, reason: string) {
  const adminId = await requirePermission("PAYMENT_VERIFY")
  await adminRejectPayment(paymentId, adminId, reason)
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
}

import { memberRegistrationSchema } from '@/lib/validations/member'
import bcrypt from 'bcryptjs'
import { ROLES } from '@/lib/auth/roles'

export async function adminCreateMember(formData: FormData) {
  const adminId = await requirePermission('MEMBER_MANAGE')

  const data = Object.fromEntries(formData.entries());
  if (data.shiftAuthorization === 'on' || data.shiftAuthorization === 'true') {
    data.shiftAuthorization = true as any;
  } else {
    data.shiftAuthorization = false as any;
  }

  const validationResult = memberRegistrationSchema.safeParse(data)
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.issues[0].message }
  }
  const validatedData = validationResult.data
  const normalizedEmail = validatedData.email.toLowerCase()

  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) return { success: false, error: 'Email already exists' }

  const passwordHash = await bcrypt.hash(validatedData.password, 10)

  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: ` `,
        email: normalizedEmail,
        passwordHash,
        role: ROLES.USER,
        emailVerified: new Date(),
      }
    })
    const profile = await tx.memberProfile.create({
      data: {
        userId: newUser.id,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        idProofType: validatedData.idProofType || null,
        idProofNumber: validatedData.idProofNumber || null,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        gender: validatedData.gender,
        serviceAddress: validatedData.serviceAddress,
        nearestLandmark: validatedData.nearestLandmark || null,
        mobileNumber: validatedData.mobileNumber,
        alternateNumber: validatedData.alternateNumber || null,
        email: normalizedEmail,
      }
    })
    await tx.emergencyContact.create({
      data: { userId: newUser.id, fullName: validatedData.emergencyContactName, relationship: validatedData.emergencyContactRelationship, phone: validatedData.emergencyContactMobile, alternatePhone: validatedData.emergencyContactOther || null, email: validatedData.emergencyContactEmail || null }
    })
    await tx.sponsor.create({
      data: { memberProfileId: profile.id, fullName: validatedData.sponsorName, relationship: validatedData.sponsorRelationship, mobileNumber: validatedData.sponsorMobile, alternateNumber: validatedData.sponsorOther || null, email: validatedData.sponsorEmail || null }
    })
    if (validatedData.insuranceProvider || validatedData.policyNumber) {
      await tx.insuranceDetails.create({ data: { memberProfileId: profile.id, providerName: validatedData.insuranceProvider || '', policyNumber: validatedData.policyNumber || '', coverageAmount: validatedData.coverageAmount || null } })
    }
    await tx.medicalAuthorization.create({
      data: { memberProfileId: profile.id, hospitalForSos: validatedData.hospitalForSos || null, nomineeLocalContact: validatedData.nomineeLocalContact || null, shiftAuthorization: validatedData.shiftAuthorization }
    })
    return newUser
  })

  await logAudit(adminId, 'MEMBER_REGISTERED_BY_ADMIN', 'USER', user.id)
  revalidatePath('/admin/members')
  return { success: true, userId: user.id }
}
