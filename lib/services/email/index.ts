export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Uint8Array;
    contentType: string;
  }[];
}

export interface EmailProviderAdapter {
  sendEmail(request: SendEmailRequest): Promise<boolean>;
}

// Mock Adapter for Development
class MockEmailAdapter implements EmailProviderAdapter {
  async sendEmail(request: SendEmailRequest): Promise<boolean> {
    console.log(`[MockEmail] Delivery suppressed. Email Provider not configured. (To: ${request.to}, Subject: ${request.subject})`);
    // Return false to indicate no actual delivery occurred when using Mock
    return false;
  }
}

export class EmailService {
  private adapter: EmailProviderAdapter;

  constructor() {
    const provider = process.env.EMAIL_PROVIDER || 'mock';
    
    switch (provider.toLowerCase()) {
      case 'resend':
        // this.adapter = new ResendAdapter();
        console.warn('Resend adapter not fully implemented yet, falling back to mock');
        this.adapter = new MockEmailAdapter();
        break;
      case 'smtp':
        // this.adapter = new SmtpAdapter();
        console.warn('SMTP adapter not fully implemented yet, falling back to mock');
        this.adapter = new MockEmailAdapter();
        break;
      case 'mock':
      default:
        this.adapter = new MockEmailAdapter();
        break;
    }
  }

  async sendEmail(request: SendEmailRequest): Promise<boolean> {
    return this.adapter.sendEmail(request);
  }

  async sendCareAssessmentNotification(assessmentData: any): Promise<boolean> {
    return this.sendEmail({
      to: process.env.CONTACT_EMAIL_RECIPIENT || 'admin@sankalpeldercare.com',
      subject: `New Care Assessment Request - ${assessmentData.customerName}`,
      text: `A new care assessment request has been submitted by ${assessmentData.customerName}.
      
Phone: ${assessmentData.customerPhone}
Email: ${assessmentData.customerEmail}
Elder: ${assessmentData.elderName || 'N/A'}
City: ${assessmentData.city || 'N/A'}
Urgency: ${assessmentData.urgency || 'Routine'}

Requirements:
${assessmentData.requirements}

Please review in the admin dashboard.`
    });
  }

  async sendInvoiceReceipt(invoice: any, customerEmail: string, pdfBytes: Uint8Array): Promise<boolean> {
    return this.sendEmail({
      to: customerEmail,
      subject: `Your Receipt for Invoice ${invoice.invoiceNumber}`,
      text: `Dear Customer,\n\nThank you for choosing Sunshine Elder Care. Please find attached the receipt for your recent subscription payment.\n\nInvoice: ${invoice.invoiceNumber}\nAmount: ₹${Number(invoice.total).toLocaleString('en-IN')}\n\nRegards,\nSunshine Elder Care`,
      attachments: [{
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBytes,
        contentType: 'application/pdf'
      }]
    });
  }
}

export const emailService = new EmailService();
