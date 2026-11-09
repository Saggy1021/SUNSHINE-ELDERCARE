import { db } from "../db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function formatINR(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `INR ${formatted}`;
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
   * Includes Member ID, financial breakdown (taxable/GST/total), duration, and verified payment status.
   */
  static async generateReceiptPdf(receiptId: string, client: any = db): Promise<Uint8Array> {
    const receipt = await client.receipt.findUnique({
      where: { id: receiptId },
      include: {
        invoice: {
          include: {
            lineItems: true,
          },
        },
        user: {
          include: {
            memberProfile: true,
          },
        },
        payment: true,
      },
    });

    if (!receipt) throw new Error("Receipt not found");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Styling
    const brandColor = rgb(0.04, 0.08, 0.16); // #091329 Navy
    const successColor = rgb(0.08, 0.55, 0.24); // Emerald Green
    const mutedColor = rgb(0.4, 0.45, 0.5);
    
    // Header
    page.drawText('SUNSHINE ELDERCARE', { x: 50, y: height - 50, size: 22, font: boldFont, color: brandColor });
    page.drawText('MONEY RECEIPT', { x: width - 230, y: height - 50, size: 18, font: boldFont, color: brandColor });
    
    // Business Info
    page.drawText('Sunshine Eldercare Private Limited', { x: 50, y: height - 68, size: 9, font: boldFont });
    page.drawText('Salt Lake Sector 5, Kolkata, West Bengal - 700091', { x: 50, y: height - 80, size: 8, font, color: mutedColor });
    page.drawText('support@sunshineeldercare.in | www.sunshineeldercare.in', { x: 50, y: height - 92, size: 8, font, color: mutedColor });

    // Receipt Meta Box (Right Side)
    const memberId = receipt.user?.memberProfile?.memberId || 'N/A';
    const invoiceNum = receipt.invoice?.invoiceNumber || receipt.invoice?.referenceNumber || 'N/A';

    page.drawText(`Receipt No: ${receipt.receiptNumber}`, { x: width - 230, y: height - 72, size: 9, font: boldFont });
    page.drawText(`Date: ${formatDate(receipt.paymentDate)}`, { x: width - 230, y: height - 84, size: 9, font });
    page.drawText(`Invoice No: ${invoiceNum}`, { x: width - 230, y: height - 96, size: 9, font });
    page.drawText(`Member ID: ${memberId}`, { x: width - 230, y: height - 108, size: 9, font: boldFont, color: brandColor });

    // Customer Snapshot
    const yCustomer = height - 140;
    page.drawLine({ start: { x: 50, y: yCustomer + 10 }, end: { x: width - 50, y: yCustomer + 10 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    page.drawText('RECEIVED FROM / MEMBER DETAILS:', { x: 50, y: yCustomer - 5, size: 9, font: boldFont, color: brandColor });
    page.drawText(`Name: ${receipt.customerName || receipt.user?.name || 'Member'}`, { x: 50, y: yCustomer - 20, size: 9, font });
    if (receipt.customerEmail || receipt.user?.email) {
      page.drawText(`Email: ${receipt.customerEmail || receipt.user?.email}`, { x: 50, y: yCustomer - 32, size: 9, font });
    }
    if (receipt.customerAddress) {
      page.drawText(`Address: ${receipt.customerAddress.substring(0, 60)}`, { x: 50, y: yCustomer - 44, size: 9, font, color: mutedColor });
    }

    // Payment Details Table
    const tableTop = yCustomer - 65;
    page.drawLine({ start: { x: 50, y: tableTop }, end: { x: width - 50, y: tableTop }, thickness: 1, color: brandColor });
    page.drawText('Description / Financial Breakdown', { x: 50, y: tableTop - 14, size: 9, font: boldFont, color: brandColor });
    page.drawText('Details', { x: width - 230, y: tableTop - 14, size: 9, font: boldFont, color: brandColor });
    page.drawLine({ start: { x: 50, y: tableTop - 22 }, end: { x: width - 50, y: tableTop - 22 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

    let yPos = tableTop - 38;
    const lineHeight = 18;

    // Plan Name
    const planName = receipt.relatedPlanName || receipt.invoice?.lineItems?.[0]?.planName || 'Membership Care Plan';
    page.drawText('Care Plan', { x: 50, y: yPos, size: 9, font });
    page.drawText(planName.substring(0, 45), { x: width - 230, y: yPos, size: 9, font: boldFont });
    yPos -= lineHeight;

    // Duration
    const durationMonths = receipt.invoice?.lineItems?.[0]?.durationMonths;
    const durationText = durationMonths ? `${durationMonths} Month${durationMonths > 1 ? 's' : ''}` : '1 Month';
    page.drawText('Membership Duration', { x: 50, y: yPos, size: 9, font });
    page.drawText(durationText, { x: width - 230, y: yPos, size: 9, font });
    yPos -= lineHeight;

    // Payment Method
    page.drawText('Payment Method', { x: 50, y: yPos, size: 9, font });
    page.drawText(receipt.paymentMethod || 'ONLINE', { x: width - 230, y: yPos, size: 9, font });
    yPos -= lineHeight;

    // Transaction Reference
    const paymentRef = receipt.paymentReference || receipt.payment?.reference || 'N/A';
    page.drawText('Transaction Reference', { x: 50, y: yPos, size: 9, font });
    page.drawText(paymentRef, { x: width - 230, y: yPos, size: 9, font: boldFont });
    yPos -= lineHeight;

    // Financial Breakdown: Taxable / Base Amount
    if (receipt.invoice?.subtotal) {
      page.drawText('Taxable / Base Amount', { x: 50, y: yPos, size: 9, font });
      page.drawText(formatINR(receipt.invoice.subtotal.toNumber()), { x: width - 230, y: yPos, size: 9, font });
      yPos -= lineHeight;
    }

    // Financial Breakdown: GST
    if (receipt.invoice?.taxAmount) {
      page.drawText('Applicable GST (18%)', { x: 50, y: yPos, size: 9, font });
      page.drawText(formatINR(receipt.invoice.taxAmount.toNumber()), { x: width - 230, y: yPos, size: 9, font });
      yPos -= lineHeight;
    }

    // Divider before Total
    page.drawLine({ start: { x: 50, y: yPos + 4 }, end: { x: width - 50, y: yPos + 4 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

    // Total Amount Received
    page.drawText('Total Amount Paid', { x: 50, y: yPos - 12, size: 10, font: boldFont, color: brandColor });
    page.drawText(formatINR(receipt.amount.toNumber()), { x: width - 230, y: yPos - 12, size: 11, font: boldFont, color: brandColor });
    yPos -= lineHeight + 8;

    page.drawLine({ start: { x: 50, y: yPos + 4 }, end: { x: width - 50, y: yPos + 4 }, thickness: 1, color: brandColor });
    
    // Payment Status Stamp
    yPos -= 28;
    page.drawText('PAYMENT STATUS: VERIFIED & CONFIRMED', { x: 50, y: yPos, size: 12, font: boldFont, color: successColor });

    // Footer
    page.drawText('Thank you for choosing Sunshine Eldercare.', { x: 50, y: 50, size: 9, font: boldFont, color: brandColor });
    page.drawText('This is an official computer-generated receipt. For queries, contact support@sunshineeldercare.in.', { x: 50, y: 36, size: 8, font, color: mutedColor });

    return await pdfDoc.save();
  }
}
