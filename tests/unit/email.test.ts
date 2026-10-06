// @ts-nocheck
import { SmtpAdapter } from '../../lib/services/email/adapters/smtp'
import * as nodemailer from 'nodemailer'
import * as configModule from '../../lib/services/email/config'

const originalCreateTransport = nodemailer.createTransport
const originalGetEmailConfig = configModule.getEmailConfig

describe('SmtpAdapter', () => {
  beforeEach(() => {
    nodemailer.createTransport = jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    })

    configModule.getEmailConfig = jest.fn().mockReturnValue({
      provider: 'smtp',
      apiKey: '',
      fromAddress: 'care@sunshineeldercare.in',
      replyToAddress: 'care@sunshineeldercare.in',
      adminNotificationAddress: 'admin@sunshineeldercare.in',
      appBaseUrl: 'http://localhost:3000',
      companyName: 'SUNSHINE',
      companyTagline: 'TAGLINE',
      smtp: {
        host: 'smtp.hostinger.com',
        port: 465,
        user: 'care@sunshineeldercare.in',
        pass: 'secretpass',
        secure: true
      }
    })
  })

  it('initializes transport with correct config', () => {
    new SmtpAdapter()
    
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'care@sunshineeldercare.in',
        pass: 'secretpass'
      },
      tls: {
        rejectUnauthorized: true
      }
    })
  })

  it('throws if config is missing required fields', () => {
    configModule.getEmailConfig = jest.fn().mockReturnValueOnce({
      provider: 'smtp',
      apiKey: '',
      fromAddress: 'care@sunshineeldercare.in',
      replyToAddress: 'care@sunshineeldercare.in',
      adminNotificationAddress: 'admin@sunshineeldercare.in',
      appBaseUrl: 'http://localhost:3000',
      companyName: 'SUNSHINE',
      companyTagline: 'TAGLINE',
      smtp: {
        host: '',
        port: 465,
        user: '',
        pass: '',
        secure: true
      }
    })

    expect(() => new SmtpAdapter()).toThrow(/SMTP configuration is incomplete/)
  })

  it('maps fields correctly on send', async () => {
    const adapter = new SmtpAdapter()
    const transport = nodemailer.createTransport()
    
    const result = await adapter.sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      text: 'Test Text',
      html: '<p>Test Html</p>',
      replyTo: 'reply@example.com'
    })

    expect(transport.sendMail).toHaveBeenCalledWith({
      from: 'care@sunshineeldercare.in',
      to: 'user@example.com',
      subject: 'Test Subject',
      text: 'Test Text',
      html: '<p>Test Html</p>',
      replyTo: 'reply@example.com'
    })

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('test-message-id')
  })
})
