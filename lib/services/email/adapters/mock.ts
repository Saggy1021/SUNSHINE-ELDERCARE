import { EmailProviderAdapter, SendEmailRequest, SendEmailResult } from './types'

/**
 * Mock adapter — used when EMAIL_PROVIDER is 'mock' or not configured.
 * Logs intent, returns { success: false, providerConfigured: false }.
 * Never claims an email was sent.
 */
export class MockEmailAdapter implements EmailProviderAdapter {
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResult> {
    console.log(`[MockEmail] Provider not configured. Suppressing delivery. (To: ${Array.isArray(request.to) ? request.to.join(', ') : request.to}, Subject: ${request.subject})`)
    return {
      success: false,
      providerConfigured: false,
      error: 'Email provider not configured (mock mode)'
    }
  }
}
