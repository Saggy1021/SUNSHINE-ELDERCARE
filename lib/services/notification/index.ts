/**
 * NotificationService — Orchestrates notification delivery for business events.
 *
 * Architecture:
 *   BusinessService/Action → NotificationService → EmailService → Provider
 *
 * Rules:
 * 1. Email delivery NEVER blocks or rolls back a business transaction.
 * 2. All notification sends are fire-and-forget with logging.
 * 3. Idempotency is enforced via the EmailNotification model (duplicate event+entity suppressed).
 * 4. Templates are resolved here — EmailService only delivers.
 * 5. All email links use the trusted server-side appBaseUrl.
 * 6. Never exposes admin addresses, tokens, or internal metadata to members.
 */

import { emailService } from '@/lib/services/email'
import { getEmailConfig } from '@/lib/services/email/config'
import { NotificationEventType } from '@/lib/services/email/types'
import * as templates from '@/lib/services/email/templates'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Idempotency Guard
// ---------------------------------------------------------------------------

/**
 * Check and record a notification event to prevent duplicate sends.
 * Returns true if this event should proceed (first occurrence).
 * Returns false if it's a duplicate.
 */
async function acquireNotificationLock(
  eventType: NotificationEventType,
  entityType: string,
  entityId: string,
  recipientEmail: string
): Promise<{ isNew: boolean; notificationId?: string }> {
  const idempotencyKey = `${eventType}:${entityType}:${entityId}`

  try {
    const existing = await db.emailNotification.findFirst({
      where: { idempotencyKey, recipientEmail }
    })

    if (existing) {
      logger.info('Notification deduplicated', { eventType, entityId, recipientEmail })
      return { isNew: false }
    }

    const notification = await db.emailNotification.create({
      data: {
        eventType,
        entityType,
        entityId,
        recipientEmail,
        idempotencyKey,
        status: 'PENDING',
      }
    })

    return { isNew: true, notificationId: notification.id }
  } catch (error: any) {
    // On unique constraint collision (concurrent race), treat as duplicate
    if (error.code === 'P2002') {
      return { isNew: false }
    }
    throw error
  }
}

async function markNotificationResult(notificationId: string, success: boolean, error?: string) {
  try {
    await db.emailNotification.update({
      where: { id: notificationId },
      data: {
        status: success ? 'SENT' : 'FAILED',
        sentAt: success ? new Date() : undefined,
        failedAt: success ? undefined : new Date(),
        error: error || undefined,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      }
    })
  } catch (e) {
    logger.error('Failed to update notification record', { notificationId, error: (e as Error).message })
  }
}

// ---------------------------------------------------------------------------
// Safe Send Helper
// ---------------------------------------------------------------------------

/**
 * Sends a notification email safely. Never throws.
 * Business logic must NEVER depend on this succeeding.
 */
async function safeSend(
  eventType: NotificationEventType,
  entityType: string,
  entityId: string,
  recipientEmail: string,
  template: { subject: string; html: string; text: string }
): Promise<void> {
  try {
    if (!recipientEmail) {
      logger.warn('Notification skipped: no recipient email', { eventType, entityId })
      return
    }

    const { isNew, notificationId } = await acquireNotificationLock(
      eventType, entityType, entityId, recipientEmail
    )

    if (!isNew) return // Duplicate — skip

    const config = getEmailConfig()
    const result = await emailService.send({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (notificationId) {
      await markNotificationResult(notificationId, result.success, result.error)
    }
  } catch (error: any) {
    logger.error('Notification delivery exception (non-fatal)', {
      eventType, entityType, entityId, recipientEmail,
      error: error.message,
    })
  }
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatINR(amount: number | any): string {
  return Number(amount).toLocaleString('en-IN')
}

// ---------------------------------------------------------------------------
// Public Notification Methods
// ---------------------------------------------------------------------------

export const notificationService = {
  /**
   * Member submitted a renewal request.
   * Called AFTER the database transaction succeeds.
   */
  async onRenewalSubmitted(renewalRequest: {
    id: string
    userId: string
    planName: string
    variantType: string
    durationMonths: number
    requestedStartDate: Date
    calculatedEndDate: Date
  }) {
    const config = getEmailConfig()
    const user = await db.user.findUnique({ where: { id: renewalRequest.userId }, select: { name: true, email: true } })
    if (!user?.email) return

    // Member notification
    const memberTemplate = templates.renewalSubmittedEmail({
      memberName: user.name || 'Member',
      planName: renewalRequest.planName,
      variantType: renewalRequest.variantType,
      durationMonths: renewalRequest.durationMonths,
      requestedStartDate: formatDate(renewalRequest.requestedStartDate),
      calculatedEndDate: formatDate(renewalRequest.calculatedEndDate),
      requestId: renewalRequest.id.slice(-8).toUpperCase(),
      dashboardUrl: `${config.appBaseUrl}/dashboard`,
    })

    await safeSend('RENEWAL_SUBMITTED', 'RenewalRequest', renewalRequest.id, user.email, memberTemplate)

    // Admin notification
    if (config.adminNotificationAddress) {
      const adminTemplate = templates.adminNewRenewalEmail({
        memberName: user.name || 'Member',
        memberEmail: user.email,
        planName: renewalRequest.planName,
        variantType: renewalRequest.variantType,
        durationMonths: renewalRequest.durationMonths,
        requestId: renewalRequest.id.slice(-8).toUpperCase(),
        adminUrl: `${config.appBaseUrl}/admin/renewals`,
      })
      await safeSend('ADMIN_NEW_RENEWAL', 'RenewalRequest', renewalRequest.id, config.adminNotificationAddress, adminTemplate)
    }
  },

  /**
   * Admin approved a renewal request.
   */
  async onRenewalApproved(renewalRequest: {
    id: string
    userId: string
    planName: string
    variantType: string
    durationMonths: number
    requestedStartDate: Date
    calculatedEndDate: Date
  }) {
    const config = getEmailConfig()
    const user = await db.user.findUnique({ where: { id: renewalRequest.userId }, select: { name: true, email: true } })
    if (!user?.email) return

    const template = templates.renewalApprovedEmail({
      memberName: user.name || 'Member',
      planName: renewalRequest.planName,
      variantType: renewalRequest.variantType,
      durationMonths: renewalRequest.durationMonths,
      startDate: formatDate(renewalRequest.requestedStartDate),
      endDate: formatDate(renewalRequest.calculatedEndDate),
      dashboardUrl: `${config.appBaseUrl}/dashboard`,
    })

    await safeSend('RENEWAL_APPROVED', 'RenewalRequest', renewalRequest.id, user.email, template)
  },

  /**
   * Admin rejected a renewal request.
   */
  async onRenewalRejected(renewalRequest: {
    id: string
    userId: string
    planName: string
  }) {
    const config = getEmailConfig()
    const user = await db.user.findUnique({ where: { id: renewalRequest.userId }, select: { name: true, email: true } })
    if (!user?.email) return

    const template = templates.renewalRejectedEmail({
      memberName: user.name || 'Member',
      planName: renewalRequest.planName,
      requestId: renewalRequest.id.slice(-8).toUpperCase(),
      dashboardUrl: `${config.appBaseUrl}/dashboard`,
    })

    await safeSend('RENEWAL_REJECTED', 'RenewalRequest', renewalRequest.id, user.email, template)
  },

  /**
   * Member submitted an offline payment.
   */
  async onPaymentSubmitted(payment: {
    id: string
    userId: string
    amount: any
    reference: string | null
    paymentMethod: string
    invoiceId: string | null
  }) {
    const config = getEmailConfig()
    const user = await db.user.findUnique({ where: { id: payment.userId }, select: { name: true, email: true } })
    if (!user?.email) return

    const invoice = payment.invoiceId
      ? await db.invoice.findUnique({ where: { id: payment.invoiceId }, select: { invoiceNumber: true, referenceNumber: true } })
      : null

    // Member notification
    const memberTemplate = templates.paymentSubmittedEmail({
      memberName: user.name || 'Member',
      amount: formatINR(payment.amount),
      invoiceNumber: invoice?.invoiceNumber || invoice?.referenceNumber || 'N/A',
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || 'N/A',
      dashboardUrl: `${config.appBaseUrl}/dashboard`,
    })

    await safeSend('PAYMENT_SUBMITTED', 'Payment', payment.id, user.email, memberTemplate)

    // Admin notification
    if (config.adminNotificationAddress) {
      const adminTemplate = templates.adminPaymentSubmittedEmail({
        memberName: user.name || 'Member',
        memberEmail: user.email,
        amount: formatINR(payment.amount),
        reference: payment.reference || 'N/A',
        invoiceNumber: invoice?.invoiceNumber || invoice?.referenceNumber || 'N/A',
        adminUrl: `${config.appBaseUrl}/admin/payments`,
      })
      await safeSend('ADMIN_PAYMENT_SUBMITTED', 'Payment', payment.id, config.adminNotificationAddress, adminTemplate)
    }
  },

  /**
   * Admin verified a payment → subscription created.
   * Called AFTER the transactional settlement succeeds.
   */
  async onPaymentVerified(payment: {
    id: string
    userId: string
    amount: any
    invoiceId: string | null
    paymentMethod: string
  }, subscription: {
    status: string
    startDate: Date | null
    endDate: Date | null
    carePlanId: string | null
    variantType: string | null
    durationMonths: number | null
    addOns?: { addOn: { name: string } }[]
  }) {
    const config = getEmailConfig()
    const user = await db.user.findUnique({ where: { id: payment.userId }, select: { name: true, email: true } })
    if (!user?.email) return

    const invoice = payment.invoiceId
      ? await db.invoice.findUnique({ where: { id: payment.invoiceId }, select: { invoiceNumber: true, referenceNumber: true } })
      : null

    const carePlan = subscription.carePlanId
      ? await db.carePlan.findUnique({ where: { id: subscription.carePlanId }, select: { name: true } })
      : null

    const planName = carePlan?.name || 'Membership'

    // Payment verified email
    const verifiedTemplate = templates.paymentVerifiedEmail({
      memberName: user.name || 'Member',
      amount: formatINR(payment.amount),
      invoiceNumber: invoice?.invoiceNumber || invoice?.referenceNumber || 'N/A',
      paymentMethod: payment.paymentMethod,
      membershipStatus: subscription.status,
      planName,
      startDate: subscription.startDate ? formatDate(subscription.startDate) : 'N/A',
      endDate: subscription.endDate ? formatDate(subscription.endDate) : 'N/A',
      dashboardUrl: `${config.appBaseUrl}/dashboard`,
    })

    await safeSend('PAYMENT_VERIFIED', 'Payment', payment.id, user.email, verifiedTemplate)

    // Membership activation/scheduled email
    const addOnNames = subscription.addOns?.map(a => a.addOn.name) || []

    if (subscription.status === 'ACTIVE') {
      const activatedTemplate = templates.membershipActivatedEmail({
        memberName: user.name || 'Member',
        planName,
        variantType: subscription.variantType || '',
        durationMonths: subscription.durationMonths || 0,
        startDate: subscription.startDate ? formatDate(subscription.startDate) : 'N/A',
        endDate: subscription.endDate ? formatDate(subscription.endDate) : 'N/A',
        addOns: addOnNames,
        dashboardUrl: `${config.appBaseUrl}/dashboard`,
      })
      await safeSend('MEMBERSHIP_ACTIVATED', 'Subscription', payment.id, user.email, activatedTemplate)
    } else if (subscription.status === 'SCHEDULED') {
      const scheduledTemplate = templates.membershipScheduledEmail({
        memberName: user.name || 'Member',
        planName,
        variantType: subscription.variantType || '',
        durationMonths: subscription.durationMonths || 0,
        startDate: subscription.startDate ? formatDate(subscription.startDate) : 'N/A',
        endDate: subscription.endDate ? formatDate(subscription.endDate) : 'N/A',
        dashboardUrl: `${config.appBaseUrl}/dashboard`,
      })
      await safeSend('MEMBERSHIP_SCHEDULED', 'Subscription', payment.id, user.email, scheduledTemplate)
    }
  },

  /**
   * Admin rejected a payment.
   */
  async onPaymentRejected(payment: {
    id: string
    userId: string
    amount: any
    invoiceId: string | null
    notes: string | null
  }) {
    const config = getEmailConfig()
    const user = await db.user.findUnique({ where: { id: payment.userId }, select: { name: true, email: true } })
    if (!user?.email) return

    const invoice = payment.invoiceId
      ? await db.invoice.findUnique({ where: { id: payment.invoiceId }, select: { invoiceNumber: true, referenceNumber: true } })
      : null

    const template = templates.paymentRejectedEmail({
      memberName: user.name || 'Member',
      amount: formatINR(payment.amount),
      invoiceNumber: invoice?.invoiceNumber || invoice?.referenceNumber || 'N/A',
      reason: payment.notes || undefined,
      dashboardUrl: `${config.appBaseUrl}/dashboard`,
    })

    await safeSend('PAYMENT_REJECTED', 'Payment', payment.id, user.email, template)
  },

  /**
   * Inquiry received from public form.
   */
  async onInquiryReceived(inquiry: {
    id: string
    fullName: string
    email: string
    phone: string
    message: string
  }) {
    const config = getEmailConfig()
    if (!config.adminNotificationAddress) return

    const template = templates.adminInquiryReceivedEmail({
      fullName: inquiry.fullName,
      email: inquiry.email,
      phone: inquiry.phone,
      message: inquiry.message,
      adminUrl: `${config.appBaseUrl}/admin/inquiries`,
    })

    await safeSend('ADMIN_INQUIRY_RECEIVED', 'Inquiry', inquiry.id, config.adminNotificationAddress, template)
  },
}
