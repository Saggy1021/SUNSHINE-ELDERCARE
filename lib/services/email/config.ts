/**
 * Email Configuration Abstraction
 * 
 * Centralizes all email-related environment variable reads.
 * No other module should read email env vars directly.
 */

export interface EmailConfig {
  /** Email provider: 'resend', 'smtp', or 'mock' */
  provider: string
  /** API key for providers like Resend/SendGrid */
  apiKey: string
  /** Default sender address for transactional emails */
  fromAddress: string
  /** Reply-to address */
  replyToAddress: string
  /** Admin notification recipient */
  adminNotificationAddress: string
  /** Application base URL for generating email links */
  appBaseUrl: string
  /** Company branding */
  companyName: string
  companyTagline: string
  /** SMTP settings (only used when provider = 'smtp') */
  smtp: {
    host: string
    port: number
    user: string
    pass: string
    secure: boolean
  }
}

let _config: EmailConfig | null = null

export function getEmailConfig(): EmailConfig {
  if (_config) return _config

  _config = {
    provider: process.env.EMAIL_PROVIDER || 'mock',
    apiKey: process.env.EMAIL_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM || 'notifications@sunshineeldercare.in',
    replyToAddress: process.env.EMAIL_REPLY_TO || 'support@sunshineeldercare.in',
    adminNotificationAddress: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL_RECIPIENT || '',
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    companyName: 'SUNSHINE ELDERCARE',
    companyTagline: 'COMPASSIONATE CARE FOR SENIORS',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true',
    },
  }

  return _config
}

/**
 * Check whether a real email provider is configured.
 * When false, the system operates safely without sending actual emails.
 */
export function isEmailProviderConfigured(): boolean {
  const config = getEmailConfig()
  if (config.provider === 'mock') return false
  if (config.provider === 'resend' && !config.apiKey) return false
  if (config.provider === 'smtp' && (!config.smtp.host || !config.smtp.user)) return false
  return true
}
