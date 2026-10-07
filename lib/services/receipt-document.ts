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

export class ReceiptDocumentService {
  /**
   * Generates a final PDF document from the immutable receipt snapshot.
   */
  static async generateReceiptPdf(receiptId: string): Promise<Uint8Array> {
    const receipt = await db.receipt.findUnique({
      where: { id: receiptId },
      include: {
        invoice: true,
      },
    });

    if (!receipt) throw new Error("Receipt not found");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Styling
    const brandColor = rgb(0.12, 0.22, 0.38); // Navy
    const successColor = rgb(0.1, 0.6, 0.2); // Green
    
    // Header
    page.drawText('SUNSHINE ELDERCARE', { x: 50, y: height - 50, size: 24, font: boldFont, color: brandColor });
    page.drawText('PAYMENT RECEIPT', { x: width - 250, y: height - 50, size: 20, font: boldFont });
    
    // Business Info
    page.drawText('123 Sunshine Avenue, Care City, 400001', { x: 50, y: height - 70, size: 10, font });
    page.drawText('info.sunshineeldercare@gmail.com | +91 98765 43210', { x: 50, y: height - 85, size: 10, font });

    // Receipt Details
    page.drawText(`Receipt Number: ${receipt.receiptNumber}`, { x: width - 200, y: height - 90, size: 10, font: boldFont });
    page.drawText(`Date: ${formatDate(receipt.paymentDate)}`, { x: width - 200, y: height - 105, size: 10, font });
    if (receipt.invoice) {
      page.drawText(`Against Invoice: ${receipt.invoice.invoiceNumber || receipt.invoice.referenceNumber}`, { x: width - 200, y: height - 120, size: 10, font });
    }

    // Customer Snapshot
    const yCustomer = height - 150;
    page.drawText('RECEIVED FROM:', { x: 50, y: yCustomer, size: 10, font: boldFont });
    page.drawText(receipt.customerName, { x: 50, y: yCustomer - 15, size: 10, font });
    if (receipt.customerEmail) page.drawText(receipt.customerEmail, { x: 50, y: yCustomer - 30, size: 10, font });
    if (receipt.customerAddress) page.drawText(receipt.customerAddress.substring(0, 50), { x: 50, y: yCustomer - 45, size: 10, font });

    // Payment Details Header
    const tableTop = yCustomer - 90;
    page.drawLine({ start: { x: 50, y: tableTop }, end: { x: width - 50, y: tableTop }, thickness: 1 });
    page.drawText('Description', { x: 50, y: tableTop - 15, size: 10, font: boldFont });
    page.drawText('Details', { x: width - 200, y: tableTop - 15, size: 10, font: boldFont });
    page.drawLine({ start: { x: 50, y: tableTop - 25 }, end: { x: width - 50, y: tableTop - 25 }, thickness: 1 });

    // Payment Details
    let yPos = tableTop - 45;
    
    page.drawText('Amount Received', { x: 50, y: yPos, size: 10, font });
    page.drawText(formatINR(receipt.amount.toNumber()), { x: width - 200, y: yPos, size: 10, font: boldFont });
    yPos -= 20;

    page.drawText('Payment Method', { x: 50, y: yPos, size: 10, font });
    page.drawText(receipt.paymentMethod, { x: width - 200, y: yPos, size: 10, font });
    yPos -= 20;

    if (receipt.paymentReference) {
      page.drawText('Transaction Reference', { x: 50, y: yPos, size: 10, font });
      page.drawText(receipt.paymentReference, { x: width - 200, y: yPos, size: 10, font });
      yPos -= 20;
    }

    if (receipt.relatedPlanName) {
      page.drawText('For Membership Plan', { x: 50, y: yPos, size: 10, font });
      page.drawText(receipt.relatedPlanName.substring(0, 40), { x: width - 200, y: yPos, size: 10, font });
      yPos -= 20;
    }

    page.drawLine({ start: { x: 50, y: yPos }, end: { x: width - 50, y: yPos }, thickness: 1 });
    
    yPos -= 30;
    page.drawText('PAYMENT SUCCESSFUL', { x: 50, y: yPos, size: 14, font: boldFont, color: successColor });

    // Footer
    page.drawText('Thank you for your payment.', { x: 50, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('This is a computer-generated document. No signature is required.', { x: 50, y: 35, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

    return await pdfDoc.save();
  }
}
