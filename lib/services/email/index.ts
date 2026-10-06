/**
 * EmailService — Provider-independent email delivery.
 *
 * Architecture:
 *   Application → NotificationService → EmailService → Provider Adapter
 *
 * The EmailService is the single delivery gateway.
 * It never decides WHAT to send — it only handles HOW.
 *
 * Provider selection is determined by EMAIL_PROVIDER env var.
 * When no real provider is configured, the MockEmailAdapter is used,
 * which logs intent without claiming delivery.
 */

import { logger } from '@/lib/logger'
import { getEmailConfig, isEmailProviderConfigured } from './config'
import { SendEmailRequest, SendEmailResult, EmailProviderAdapter } from './types'
import { MockEmailAdapter } from './adapters/mock'
import { SmtpAdapter } from './adapters/smtp'

export class EmailService {
  private adapter: EmailProviderAdapter
  private configured: boolean

  constructor() {
    const config = getEmailConfig()
    this.configured = isEmailProviderConfigured()

    switch (config.provider.toLowerCase()) {
      case 'resend':
        // Future: import and instantiate ResendAdapter
        logger.warn('Resend adapter not implemented, falling back to mock')
        this.adapter = new MockEmailAdapter()
        this.configured = false
        break
      case 'smtp':
        this.adapter = new SmtpAdapter()
        this.configured = true
        break
      case 'mock':
      default:
        this.adapter = new MockEmailAdapter()
        this.configured = false
        break
    }
  }

  /**
   * Send an email through the configured provider adapter.
   * Returns a result object — never throws on delivery failure.
   */
  async send(request: SendEmailRequest): Promise<SendEmailResult> {
    const config = getEmailConfig()

    // Inject default from/replyTo if not provided
    const enrichedRequest: SendEmailRequest = {
      ...request,
      replyTo: request.replyTo || config.replyToAddress,
    }

    try {
      const result = await this.adapter.sendEmail(enrichedRequest)
      
      if (result.success) {
        logger.info('Email delivered', {
          to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
          subject: request.subject,
          messageId: result.messageId,
        })
      } else {
        logger.warn('Email delivery failed or suppressed', {
          to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
          subject: request.subject,
          providerConfigured: result.providerConfigured,
          error: result.error,
        })
      }

      return result
    } catch (error: any) {
      logger.error('Email delivery exception', {
        to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
        subject: request.subject,
        error: error.message,
      })
      return {
        success: false,
        providerConfigured: this.configured,
        error: error.message,
      }
    }
  }

  /**
   * Whether a real email provider is configured.
   */
  isConfigured(): boolean {
    return this.configured
  }
}

export const emailService = new EmailService()

// Re-export types for convenience
export type { SendEmailRequest, SendEmailResult, EmailProviderAdapter } from './types'
