import { db } from "../db";
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import * as fs from 'fs';
import * as path from 'path';

function formatINR(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

const numWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertNumberToWords(num: number): string {
  if (num === 0) return "Zero";
  if (num < 20) return numWords[num];
  if (num < 100) return tensWords[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + numWords[num % 10] : "");
  if (num < 1000) return numWords[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + convertNumberToWords(num % 100) : "");
  if (num < 100000) return convertNumberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + convertNumberToWords(num % 1000) : "");
  if (num < 10000000) return convertNumberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + convertNumberToWords(num % 100000) : "");
  return convertNumberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + convertNumberToWords(num % 10000000) : "");
}

function getAmountInWords(amount: number): string {
  try {
    const words = convertNumberToWords(Math.floor(amount));
    return `Rupees ${words} Only`;
  } catch (e) {
    return "";
  }
}

export class ReceiptDocumentService {
  static async generateReceiptPdf(receiptId: string): Promise<Uint8Array> {
    const receipt = await db.receipt.findUnique({
      where: { id: receiptId },
      include: {
        invoice: true,
        user: {
          include: { memberProfile: true }
        }
      },
    });

    if (!receipt) throw new Error("Receipt not found");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.3, 0.3, 0.3);

    // 1. Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.3); // Scale down
      page.drawImage(logoImage, {
        x: 50,
        y: height - 50 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch (e) {
      console.error("Could not load logo for receipt:", e);
    }

    // 2. Header Info
    let y = height - 60;
    const headerX = 200; // Align right of logo
    page.drawText('1/67 Naktala N S C Bose Road, KOLKATA-700047', { x: headerX, y, size: 10, font }); y -= 14;
    page.drawText('8582907723', { x: headerX, y, size: 10, font }); y -= 14;
    page.drawText('info.sunshineeldercare@gmail.com', { x: headerX, y, size: 10, font }); y -= 14;
    page.drawText('www.sunshineeldercare.in', { x: headerX, y, size: 10, font }); y -= 30;

    // PAYMENT RECEIPT TITLE
    const title = 'PAYMENT RECEIPT';
    const titleWidth = boldFont.widthOfTextAtSize(title, 14);
    page.drawText(title, { x: (width - titleWidth) / 2, y, size: 14, font: boldFont, color: black });
    
    // Underline title
    page.drawLine({
      start: { x: (width - titleWidth) / 2, y: y - 2 },
      end: { x: ((width - titleWidth) / 2) + titleWidth, y: y - 2 },
      thickness: 1,
      color: black
    });

    y -= 30;

    // 3. RECEIPT INFORMATION GRID
    const leftColX = 50;
    const rightColX = width / 2;
    const rowHeight = 16;
    
    // Fetch related subscription if available to get start/end dates
    let startDate = "";
    let endDate = "";
    let duration = "N/A";

    const memberId = receipt.user.memberProfile?.memberId || "N/A";
    
    // If the payment is related to a subscription, we'd need to extract it, but we can't reliably from receipt model alone.
    // However, the prompt says "Service Period -> authoritative subscription start/end dates".
    // We can fetch the latest subscription for this payment.
    const sub = await db.subscription.findFirst({
      where: { userId: receipt.userId },
      orderBy: { createdAt: 'desc' }
    });

    if (sub) {
      startDate = sub.startDate ? formatDate(sub.startDate) : "";
      endDate = sub.endDate ? formatDate(sub.endDate) : "";
      duration = sub.durationMonths ? `${sub.durationMonths} Months` : "N/A";
    }

    const servicePeriod = startDate && endDate ? `${startDate} to ${endDate}` : "N/A";

    // Row 1
    page.drawText('Received From:', { x: leftColX, y, size: 10, font: boldFont });
    page.drawText(receipt.customerName, { x: leftColX + 100, y, size: 10, font });
    page.drawText('Receipt No.:', { x: rightColX, y, size: 10, font: boldFont });
    page.drawText(receipt.receiptNumber, { x: rightColX + 80, y, size: 10, font });
    y -= rowHeight;

    // Row 2
    page.drawText('Member ID:', { x: leftColX, y, size: 10, font: boldFont });
    page.drawText(memberId, { x: leftColX + 100, y, size: 10, font });
    page.drawText('Receipt Date:', { x: rightColX, y, size: 10, font: boldFont });
    page.drawText(formatDate(receipt.paymentDate), { x: rightColX + 80, y, size: 10, font });
    y -= rowHeight;

    // Row 3
    page.drawText('Plan / Service Type:', { x: leftColX, y, size: 10, font: boldFont });
    page.drawText(receipt.relatedPlanName || "Service", { x: leftColX + 100, y, size: 10, font });
    page.drawText('Invoice No.:', { x: rightColX, y, size: 10, font: boldFont });
    page.drawText(receipt.invoice?.invoiceNumber || "N/A", { x: rightColX + 80, y, size: 10, font });
    y -= rowHeight;

    // Row 4
    page.drawText('Plan Duration:', { x: leftColX, y, size: 10, font: boldFont });
    page.drawText(duration, { x: leftColX + 100, y, size: 10, font });
    page.drawText('Service Period:', { x: rightColX, y, size: 10, font: boldFont });
    page.drawText(servicePeriod, { x: rightColX + 80, y, size: 10, font });
    y -= 30;

    // 4. MAIN TABLE
    const tableTop = y;
    const tableHeaderHeight = 25;
    const tableRowHeight = 25;
    
    // Draw table borders
    // Outer rectangle
    page.drawRectangle({
      x: 50, y: tableTop - tableHeaderHeight - tableRowHeight,
      width: width - 100, height: tableHeaderHeight + tableRowHeight,
      borderColor: black, borderWidth: 1
    });
    // Header bottom line
    page.drawLine({
      start: { x: 50, y: tableTop - tableHeaderHeight },
      end: { x: width - 50, y: tableTop - tableHeaderHeight },
      thickness: 1, color: black
    });

    // Column positions (8 columns)
    const colX = [50, 85, 200, 260, 340, 390, 440, 545];
    
    // Draw vertical lines
    for (let i = 1; i < colX.length - 1; i++) {
      page.drawLine({
        start: { x: colX[i], y: tableTop },
        end: { x: colX[i], y: tableTop - tableHeaderHeight - tableRowHeight },
        thickness: 1, color: black
      });
    }

    // Header Text
    const hY = tableTop - 15;
    const headers = [
      "Sl. No.", "Particulars", "Plan Duration", "Service Period", 
      "Amount (Rs.)", "Discount (Rs.)", "Total Amount (Rs.)"
    ];
    
    let currentX = 0;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x: colX[i] + 5, y: hY, size: 8, font: boldFont });
    }

    // Row 1 Text
    const rY = tableTop - tableHeaderHeight - 15;
    page.drawText("1", { x: colX[0] + 15, y: rY, size: 8, font });
    page.drawText(receipt.relatedPlanName || "Service", { x: colX[1] + 5, y: rY, size: 8, font });
    page.drawText(duration, { x: colX[2] + 5, y: rY, size: 8, font });
    page.drawText(servicePeriod, { x: colX[3] + 5, y: rY, size: 8, font });
    page.drawText(formatINR(receipt.invoice?.subtotal?.toNumber() || receipt.amount.toNumber()), { x: colX[4] + 5, y: rY, size: 8, font });
    page.drawText(formatINR(0), { x: colX[5] + 5, y: rY, size: 8, font });
    page.drawText(formatINR(receipt.amount.toNumber()), { x: colX[6] + 5, y: rY, size: 8, font });

    y = tableTop - tableHeaderHeight - tableRowHeight - 20;

    // TOTAL row
    page.drawText('Total', { x: colX[5], y, size: 10, font: boldFont });
    page.drawText(`Rs. ${formatINR(receipt.amount.toNumber())}`, { x: colX[6], y, size: 10, font: boldFont });
    
    // Inclusive of all charges
    page.drawText('(Inclusive of all charges)', { x: width - 150, y: y - 12, size: 8, font });

    y -= 40;

    // AMOUNT RECEIVED IN WORDS
    page.drawText('Amount Received (in words):', { x: 50, y, size: 10, font: boldFont });
    const amtWords = getAmountInWords(receipt.amount.toNumber());
    page.drawText(amtWords, { x: 210, y, size: 10, font });
    
    y -= 40;

    // PAYMENT DETAILS
    page.drawText('Payment Details', { x: 50, y, size: 10, font: boldFont });
    page.drawLine({ start: {x: 50, y: y-2}, end: {x: 50 + boldFont.widthOfTextAtSize('Payment Details', 10), y: y-2}, thickness: 1, color: black });
    y -= 20;

    const pmLabelX = 50;
    const pmValX = 200;
    const pmSpacing = 15;

    page.drawText('Payment Mode', { x: pmLabelX, y, size: 10, font });
    page.drawText(':', { x: pmValX - 10, y, size: 10, font });
    page.drawText(receipt.paymentMethod, { x: pmValX, y, size: 10, font });
    y -= pmSpacing;

    page.drawText('Transaction / UTR No.', { x: pmLabelX, y, size: 10, font });
    page.drawText(':', { x: pmValX - 10, y, size: 10, font });
    page.drawText(receipt.paymentReference || "N/A", { x: pmValX, y, size: 10, font });
    y -= pmSpacing;

    page.drawText('Payment Date', { x: pmLabelX, y, size: 10, font });
    page.drawText(':', { x: pmValX - 10, y, size: 10, font });
    page.drawText(formatDate(receipt.paymentDate), { x: pmValX, y, size: 10, font });
    y -= pmSpacing;

    page.drawText('Amount Received', { x: pmLabelX, y, size: 10, font });
    page.drawText(':', { x: pmValX - 10, y, size: 10, font });
    page.drawText(`Rs. ${formatINR(receipt.amount.toNumber())}`, { x: pmValX, y, size: 10, font });
    y -= pmSpacing;

    page.drawText('Balance Due', { x: pmLabelX, y, size: 10, font });
    page.drawText(':', { x: pmValX - 10, y, size: 10, font });
    page.drawText(`Rs. 0.00`, { x: pmValX, y, size: 10, font });
    y -= 30;

    // REMARKS
    page.drawText('Remarks:', { x: 50, y, size: 10, font: boldFont });
    page.drawText('Payment successfully processed. Thank you for choosing Sunshine Eldercare.', { x: 110, y, size: 10, font });

    return await pdfDoc.save();
  }
}
