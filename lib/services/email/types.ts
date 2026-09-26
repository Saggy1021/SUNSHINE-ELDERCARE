/**
 * Email type definitions.
 */

export interface SendEmailRequest {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  content: Uint8Array
  contentType: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  providerConfigured: boolean
}

export interface EmailProviderAdapter {
  sendEmail(request: SendEmailRequest): Promise<SendEmailResult>
}

/**
 * Notification event types — used for idempotency and tracking.
 */
export type NotificationEventType =
  | 'ACCOUNT_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'RENEWAL_SUBMITTED'
  | 'RENEWAL_APPROVED'
  | 'RENEWAL_REJECTED'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'INVOICE_AVAILABLE'
  | 'MEMBERSHIP_ACTIVATED'
  | 'MEMBERSHIP_SCHEDULED'
  | 'ADMIN_NEW_RENEWAL'
  | 'ADMIN_PAYMENT_SUBMITTED'
  | 'ADMIN_INQUIRY_RECEIVED'

export interface NotificationRequest {
  eventType: NotificationEventType
  recipientEmail: string
  recipientName?: string
  subject: string
  html: string
  text?: string
  /** Entity reference for idempotency (e.g., renewalRequestId, paymentId) */
  entityId: string
  entityType: string
  /** Optional idempotency key — if set, duplicate sends with the same key are suppressed */
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}
