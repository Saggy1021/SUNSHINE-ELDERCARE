import * as nodemailer from 'nodemailer'
import { EmailProviderAdapter, SendEmailRequest, SendEmailResult } from '../types'
import { getEmailConfig } from '../config'
import { logger } from '@/lib/logger'

export class SmtpAdapter implements EmailProviderAdapter {
  private transporter: nodemailer.Transporter

  constructor() {
    const config = getEmailConfig()
    
    // Explicitly validate configuration before initializing transport
    if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
      throw new Error('SMTP configuration is incomplete. Host, user, and pass are required.')
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      // Do not allow unauthorized TLS connections in production
      tls: {
        rejectUnauthorized: true
      }
    })
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResult> {
    const config = getEmailConfig()
    
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.fromAddress,
        to: request.to,
        subject: request.subject,
        text: request.text,
        html: request.html,
        replyTo: request.replyTo,
      }

      if (request.attachments) {
        mailOptions.attachments = request.attachments.map(att => ({
          filename: att.filename,
          content: Buffer.from(att.content),
          contentType: att.contentType
        }))
      }

      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
        providerConfigured: true,
      }
    } catch (error: any) {
      logger.error('SMTP send error', {
        error: error.message,
        code: error.code,
        // Intentionally avoiding logging the full error object or transport
        // as it can contain the raw SMTP pass.
      })
      
      return {
        success: false,
        providerConfigured: true,
        error: error.message || 'Unknown SMTP error',
      }
    }
  }
}
