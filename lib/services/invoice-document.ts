import { db } from "../db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export class InvoiceDocumentService {
  /**
   * Generates a final PDF document from the immutable invoice snapshot.
   */
  static async generateInvoicePdf(invoiceId: string): Promise<Uint8Array> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!invoice) throw new Error("Invoice not found");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Styling
    const brandColor = rgb(0.12, 0.22, 0.38); // Navy
    
    // Header
    page.drawText('SUNSHINE ELDERCARE', { x: 50, y: height - 50, size: 24, font: boldFont, color: brandColor });
    page.drawText('INVOICE', { x: width - 150, y: height - 50, size: 24, font: boldFont });
    
    // Business Info
    page.drawText('123 Sunshine Avenue, Care City, 400001', { x: 50, y: height - 70, size: 10, font });
    page.drawText('contact@sunshineeldercare.com | +91 98765 43210', { x: 50, y: height - 85, size: 10, font });

    // Invoice Details
    page.drawText(`Invoice Number: ${invoice.invoiceNumber || invoice.referenceNumber}`, { x: width - 200, y: height - 90, size: 10, font: boldFont });
    page.drawText(`Issue Date: ${formatDate(invoice.issueDate)}`, { x: width - 200, y: height - 105, size: 10, font });
    page.drawText(`Status: ${invoice.paymentStatus}`, { x: width - 200, y: height - 120, size: 10, font });

    // Customer Snapshot
    const yCustomer = height - 150;
    page.drawText('BILLED TO:', { x: 50, y: yCustomer, size: 10, font: boldFont });
    page.drawText(invoice.customerName || invoice.user.name || 'Member', { x: 50, y: yCustomer - 15, size: 10, font });
    if (invoice.customerEmail) page.drawText(invoice.customerEmail, { x: 50, y: yCustomer - 30, size: 10, font });
    if (invoice.customerAddress) page.drawText(invoice.customerAddress.substring(0, 50), { x: 50, y: yCustomer - 45, size: 10, font });

    // Line Items Header
    const tableTop = yCustomer - 90;
    page.drawLine({ start: { x: 50, y: tableTop }, end: { x: width - 50, y: tableTop }, thickness: 1 });
    page.drawText('Description', { x: 50, y: tableTop - 15, size: 10, font: boldFont });
    page.drawText('Amount', { x: width - 100, y: tableTop - 15, size: 10, font: boldFont });
    page.drawLine({ start: { x: 50, y: tableTop - 25 }, end: { x: width - 50, y: tableTop - 25 }, thickness: 1 });

    // Line Items
    let yPos = tableTop - 45;
    for (const item of invoice.lineItems) {
      page.drawText(item.description.substring(0, 60), { x: 50, y: yPos, size: 10, font });
      page.drawText(formatINR(item.lineTotal.toNumber()), { x: width - 100, y: yPos, size: 10, font });
      
      if (item.discountNote) {
        yPos -= 15;
        page.drawText(item.discountNote, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      }
      yPos -= 20;
    }

    // Totals
    page.drawLine({ start: { x: width - 200, y: yPos }, end: { x: width - 50, y: yPos }, thickness: 1 });
    yPos -= 20;
    if (invoice.subtotal) {
      page.drawText('Subtotal:', { x: width - 180, y: yPos, size: 10, font });
      page.drawText(formatINR(invoice.subtotal.toNumber()), { x: width - 100, y: yPos, size: 10, font });
      yPos -= 15;
    }
    if (invoice.taxAmount) {
      page.drawText('Tax (GST):', { x: width - 180, y: yPos, size: 10, font });
      page.drawText(formatINR(invoice.taxAmount.toNumber()), { x: width - 100, y: yPos, size: 10, font });
      yPos -= 15;
    }
    
    page.drawText('Total:', { x: width - 180, y: yPos, size: 12, font: boldFont, color: brandColor });
    page.drawText(formatINR(invoice.total.toNumber()), { x: width - 100, y: yPos, size: 12, font: boldFont, color: brandColor });

    // Footer
    page.drawText('Thank you for choosing Sunshine Eldercare.', { x: 50, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('This is a computer-generated document. No signature is required.', { x: 50, y: 35, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

    return await pdfDoc.save();
  }
}
