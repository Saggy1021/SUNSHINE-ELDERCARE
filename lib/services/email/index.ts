export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailProviderAdapter {
  sendEmail(request: SendEmailRequest): Promise<boolean>;
}

// Mock Adapter for Development
class MockEmailAdapter implements EmailProviderAdapter {
  async sendEmail(request: SendEmailRequest): Promise<boolean> {
    console.log('[MockEmail] Sending email:', request);
    return true;
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
}

export const emailService = new EmailService();
