/**
 * Email template layout and individual templates for SUNSHINE ELDERCARE.
 * 
 * All templates use table-based layout for maximum email client compatibility.
 * Brand identity: navy (#1e293b) / gold (#d4a853) / white.
 */

import { getEmailConfig } from './config'

// ---------------------------------------------------------------------------
// Base Layout
// ---------------------------------------------------------------------------

export function baseLayout(bodyContent: string): string {
  const config = getEmailConfig()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${config.companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background-color:#1e293b;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#d4a853;font-size:22px;font-weight:700;letter-spacing:1px;">${config.companyName}</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${config.companyTagline}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} ${config.companyName}. All rights reserved.</p>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">Kolkata, West Bengal, India</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:700;">${text}</h2>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">${text}</p>`
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;width:40%;">${label}</td>
    <td style="padding:8px 12px;color:#1e293b;font-size:13px;border-bottom:1px solid #f1f5f9;">${value}</td>
  </tr>`
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    ${rows.map(([l, v]) => detailRow(l, v)).join('')}
  </table>`
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:#d4a853;border-radius:8px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:#1e293b;font-size:14px;font-weight:700;text-decoration:none;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`
}

function statusBadge(status: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 12px;background-color:${color};color:#ffffff;font-size:12px;font-weight:600;border-radius:12px;letter-spacing:0.5px;">${status}</span>`
}

function securityNotice(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#fef3c7;border:1px solid #fbbf24;border-radius:8px;">
    <tr>
      <td style="padding:12px 16px;color:#92400e;font-size:12px;line-height:1.5;">
        ⚠️ ${text}
      </td>
    </tr>
  </table>`
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function renewalSubmittedEmail(data: {
  memberName: string
  planName: string
  variantType: string
  durationMonths: number
  requestedStartDate: string
  calculatedEndDate: string
  requestId: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Renewal Request Submitted'
  const html = baseLayout(`
    ${heading('Renewal Request Submitted')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Your membership renewal request has been submitted successfully and is now awaiting admin review.')}
    ${detailsTable([
      ['Package', data.planName],
      ['Variant', data.variantType],
      ['Duration', `${data.durationMonths} Month${data.durationMonths > 1 ? 's' : ''}`],
      ['Requested Start', data.requestedStartDate],
      ['Expected End', data.calculatedEndDate],
      ['Reference', data.requestId],
      ['Status', 'Submitted — Awaiting Review'],
    ])}
    ${paragraph('Our team will review your request shortly. You will receive an email once your request has been processed.')}
    ${ctaButton('View Dashboard', data.dashboardUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nYour renewal request for ${data.planName} (${data.variantType}, ${data.durationMonths} months) has been submitted. Reference: ${data.requestId}.\n\nStatus: Awaiting admin review.\n\nView your dashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function renewalApprovedEmail(data: {
  memberName: string
  planName: string
  variantType: string
  durationMonths: number
  startDate: string
  endDate: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Renewal Request Approved'
  const html = baseLayout(`
    ${heading('Renewal Request Approved')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Great news! Your membership renewal request has been <strong>approved</strong>.')}
    ${detailsTable([
      ['Package', data.planName],
      ['Variant', data.variantType],
      ['Duration', `${data.durationMonths} Month${data.durationMonths > 1 ? 's' : ''}`],
      ['Start Date', data.startDate],
      ['End Date', data.endDate],
      ['Status', 'Approved'],
    ])}
    ${paragraph('<strong>Next Step:</strong> Please proceed to payment to activate your membership.')}
    ${ctaButton('Proceed to Payment', data.dashboardUrl)}
    ${securityNotice('Your membership will only become active after payment is verified. This email does not confirm membership activation.')}
  `)
  const text = `Dear ${data.memberName},\n\nYour renewal for ${data.planName} has been approved.\n\nNext step: Please proceed to payment to activate your membership.\n\nDashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function renewalRejectedEmail(data: {
  memberName: string
  planName: string
  requestId: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Renewal Request Update'
  const html = baseLayout(`
    ${heading('Renewal Request Update')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('We regret to inform you that your membership renewal request could not be approved at this time.')}
    ${detailsTable([
      ['Package', data.planName],
      ['Reference', data.requestId],
      ['Status', 'Not Approved'],
    ])}
    ${paragraph('If you have questions, please contact our support team for assistance.')}
    ${ctaButton('View Dashboard', data.dashboardUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nYour renewal request (Ref: ${data.requestId}) for ${data.planName} could not be approved. Please contact support.\n\nDashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function paymentSubmittedEmail(data: {
  memberName: string
  amount: string
  invoiceNumber: string
  paymentMethod: string
  reference: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Payment Submitted for Verification'
  const html = baseLayout(`
    ${heading('Payment Submitted for Verification')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Your payment has been submitted and is pending admin verification.')}
    ${detailsTable([
      ['Amount', `₹${data.amount}`],
      ['Invoice', data.invoiceNumber],
      ['Payment Method', data.paymentMethod],
      ['Reference', data.reference],
      ['Status', 'Pending Verification'],
    ])}
    ${paragraph('You will receive a confirmation once your payment has been verified by our team.')}
    ${ctaButton('View Dashboard', data.dashboardUrl)}
    ${securityNotice('This email confirms receipt of your payment reference only. Your membership will be activated after payment verification.')}
  `)
  const text = `Dear ${data.memberName},\n\nPayment of ₹${data.amount} submitted (Ref: ${data.reference}). Status: Pending verification.\n\nDashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function paymentVerifiedEmail(data: {
  memberName: string
  amount: string
  invoiceNumber: string
  paymentMethod: string
  membershipStatus: string
  planName: string
  startDate: string
  endDate: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const statusText = data.membershipStatus === 'SCHEDULED'
    ? 'Your membership is scheduled and will begin on the start date below.'
    : 'Your membership is now active.'
  const subject = 'Payment Verified'
  const html = baseLayout(`
    ${heading('Payment Verified')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Your payment has been <strong>verified successfully</strong>.')}
    ${detailsTable([
      ['Verified Amount', `₹${data.amount}`],
      ['Invoice', data.invoiceNumber],
      ['Package', data.planName],
      ['Membership Status', data.membershipStatus === 'SCHEDULED' ? 'Scheduled' : 'Active'],
      ['Start Date', data.startDate],
      ['End Date', data.endDate],
    ])}
    ${paragraph(statusText)}
    ${ctaButton('View Dashboard', data.dashboardUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nPayment of ₹${data.amount} verified. ${statusText}\n\nPackage: ${data.planName}\nStart: ${data.startDate}\nEnd: ${data.endDate}\n\nDashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function paymentRejectedEmail(data: {
  memberName: string
  amount: string
  invoiceNumber: string
  reason?: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Payment Verification Update'
  const html = baseLayout(`
    ${heading('Payment Verification Update')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Unfortunately, your payment verification could not be completed.')}
    ${detailsTable([
      ['Amount', `₹${data.amount}`],
      ['Invoice', data.invoiceNumber],
      ['Status', 'Verification Unsuccessful'],
      ...(data.reason ? [['Note', data.reason] as [string, string]] : []),
    ])}
    ${paragraph('Please review and retry your payment, or contact our support team for assistance.')}
    ${ctaButton('Retry Payment', data.dashboardUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nPayment verification for ₹${data.amount} (Invoice: ${data.invoiceNumber}) was unsuccessful.${data.reason ? ` Note: ${data.reason}` : ''}\n\nPlease retry: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function membershipActivatedEmail(data: {
  memberName: string
  planName: string
  variantType: string
  durationMonths: number
  startDate: string
  endDate: string
  addOns: string[]
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Membership Activated'
  const addOnsList = data.addOns.length > 0 ? data.addOns.join(', ') : 'None'
  const html = baseLayout(`
    ${heading('🎉 Membership Activated')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Welcome! Your membership is now <strong>active</strong>.')}
    ${detailsTable([
      ['Package', data.planName],
      ['Variant', data.variantType],
      ['Duration', `${data.durationMonths} Month${data.durationMonths > 1 ? 's' : ''}`],
      ['Start Date', data.startDate],
      ['End Date', data.endDate],
      ['Add-ons', addOnsList],
      ['Status', 'Active'],
    ])}
    ${paragraph('You now have full access to your membership benefits. Visit your dashboard to manage your membership.')}
    ${ctaButton('Go to Dashboard', data.dashboardUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nYour ${data.planName} membership is now active.\nStart: ${data.startDate}\nEnd: ${data.endDate}\n\nDashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function membershipScheduledEmail(data: {
  memberName: string
  planName: string
  variantType: string
  durationMonths: number
  startDate: string
  endDate: string
  dashboardUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Membership Scheduled'
  const html = baseLayout(`
    ${heading('Membership Scheduled')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Your membership has been confirmed and is <strong>scheduled</strong> to begin on the date below.')}
    ${detailsTable([
      ['Package', data.planName],
      ['Variant', data.variantType],
      ['Duration', `${data.durationMonths} Month${data.durationMonths > 1 ? 's' : ''}`],
      ['Scheduled Start', data.startDate],
      ['End Date', data.endDate],
      ['Status', 'Scheduled'],
    ])}
    ${paragraph('Your membership is not yet active. It will automatically activate on the scheduled start date.')}
    ${ctaButton('View Dashboard', data.dashboardUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nYour ${data.planName} membership is scheduled to start on ${data.startDate}.\nEnd: ${data.endDate}\n\nNote: Your membership is not yet active.\n\nDashboard: ${data.dashboardUrl}`
  return { subject, html, text }
}

export function invoiceAvailableEmail(data: {
  memberName: string
  invoiceNumber: string
  amount: string
  paymentStatus: string
  planName: string
  invoiceUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `Invoice ${data.invoiceNumber} Available`
  const html = baseLayout(`
    ${heading('Invoice Available')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph(`Your invoice <strong>${data.invoiceNumber}</strong> is now available.`)}
    ${detailsTable([
      ['Invoice Number', data.invoiceNumber],
      ['Package', data.planName],
      ['Amount', `₹${data.amount}`],
      ['Payment Status', data.paymentStatus],
    ])}
    ${ctaButton('View Invoice', data.invoiceUrl)}
  `)
  const text = `Dear ${data.memberName},\n\nInvoice ${data.invoiceNumber} for ₹${data.amount} is available.\nStatus: ${data.paymentStatus}\n\nView: ${data.invoiceUrl}`
  return { subject, html, text }
}

export function adminNewRenewalEmail(data: {
  memberName: string
  memberEmail: string
  planName: string
  variantType: string
  durationMonths: number
  requestId: string
  adminUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `New Renewal Request — ${data.memberName}`
  const html = baseLayout(`
    ${heading('New Renewal Request')}
    ${paragraph('A new membership renewal request requires your review.')}
    ${detailsTable([
      ['Member', data.memberName],
      ['Email', data.memberEmail],
      ['Package', data.planName],
      ['Variant', data.variantType],
      ['Duration', `${data.durationMonths} Month${data.durationMonths > 1 ? 's' : ''}`],
      ['Reference', data.requestId],
    ])}
    ${ctaButton('Review in Admin Portal', data.adminUrl)}
  `)
  const text = `New renewal request from ${data.memberName} (${data.memberEmail}). Package: ${data.planName}, ${data.variantType}, ${data.durationMonths}mo. Review: ${data.adminUrl}`
  return { subject, html, text }
}

export function adminPaymentSubmittedEmail(data: {
  memberName: string
  memberEmail: string
  amount: string
  reference: string
  invoiceNumber: string
  adminUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `Payment Verification Required — ${data.memberName}`
  const html = baseLayout(`
    ${heading('Payment Verification Required')}
    ${paragraph('An offline payment has been submitted and requires verification.')}
    ${detailsTable([
      ['Member', data.memberName],
      ['Email', data.memberEmail],
      ['Amount', `₹${data.amount}`],
      ['Invoice', data.invoiceNumber],
      ['Payment Reference', data.reference],
    ])}
    ${ctaButton('Review in Admin Portal', data.adminUrl)}
  `)
  const text = `Payment verification required for ${data.memberName}. Amount: ₹${data.amount}, Ref: ${data.reference}. Review: ${data.adminUrl}`
  return { subject, html, text }
}

export function adminInquiryReceivedEmail(data: {
  fullName: string
  email: string
  phone: string
  message: string
  adminUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `New Inquiry — ${data.fullName}`
  const html = baseLayout(`
    ${heading('New Inquiry Received')}
    ${paragraph('A new inquiry has been submitted through the website.')}
    ${detailsTable([
      ['Name', data.fullName],
      ['Email', data.email],
      ['Phone', data.phone],
    ])}
    ${paragraph(`<strong>Message:</strong><br/>${data.message.replace(/\n/g, '<br/>')}`)}
    ${ctaButton('View in Admin Portal', data.adminUrl)}
  `)
  const text = `New inquiry from ${data.fullName} (${data.email}, ${data.phone}).\n\n${data.message}\n\nReview: ${data.adminUrl}`
  return { subject, html, text }
}

export function accountVerificationEmail(data: {
  memberName: string
  verificationUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Verify your email address'
  const html = baseLayout(`
    ${heading('Verify Your Email')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('Thank you for registering with us. Please verify your email address to complete your registration.')}
    ${ctaButton('Verify Email', data.verificationUrl)}
    ${securityNotice('This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.')}
  `)
  const text = `Dear ${data.memberName},\n\nPlease verify your email address by visiting this link: ${data.verificationUrl}\n\nThis link will expire in 24 hours.`
  return { subject, html, text }
}

export function passwordResetEmail(data: {
  memberName: string
  resetUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'Password Reset Request'
  const html = baseLayout(`
    ${heading('Password Reset Request')}
    ${paragraph(`Dear ${data.memberName},`)}
    ${paragraph('We received a request to reset your password. Click the button below to choose a new password.')}
    ${ctaButton('Reset Password', data.resetUrl)}
    ${securityNotice('This link will expire in 1 hour. If you did not request a password reset, please ignore this email; your password will remain unchanged.')}
  `)
  const text = `Dear ${data.memberName},\n\nReset your password by visiting this link: ${data.resetUrl}\n\nThis link will expire in 1 hour.`
  return { subject, html, text }
}
