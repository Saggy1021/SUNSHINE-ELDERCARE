import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export class PdfService {
  async generateInvoicePdf(invoice: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const { width, height } = page.getSize()
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Draw Header
    page.drawText('Sunshine Elder Care', { x: 50, y: height - 50, size: 24, font: boldFont })
    page.drawText('INVOICE', { x: width - 150, y: height - 50, size: 24, font: boldFont })
    
    // Draw Invoice Details
    page.drawText(`Invoice Number: ${invoice.invoiceNumber}`, { x: 50, y: height - 100, size: 12, font })
    page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { x: 50, y: height - 120, size: 12, font })
    page.drawText(`Status: ${invoice.paymentStatus}`, { x: 50, y: height - 140, size: 12, font })
    
    // Draw Customer Details
    page.drawText('Bill To:', { x: 50, y: height - 180, size: 12, font: boldFont })
    page.drawText(`Customer ID: ${invoice.userId}`, { x: 50, y: height - 200, size: 12, font }) // Normally would have name, but we only have ID here
    
    // Draw Line Items Header
    const tableTop = height - 260
    page.drawLine({ start: { x: 50, y: tableTop }, end: { x: width - 50, y: tableTop }, thickness: 1 })
    page.drawText('Description', { x: 50, y: tableTop - 20, size: 12, font: boldFont })
    page.drawText('Amount', { x: width - 150, y: tableTop - 20, size: 12, font: boldFont })
    page.drawLine({ start: { x: 50, y: tableTop - 30 }, end: { x: width - 50, y: tableTop - 30 }, thickness: 1 })
    
    // Draw Line Items
    let currentY = tableTop - 50
    for (const item of invoice.lineItems) {
      page.drawText(item.description, { x: 50, y: currentY, size: 11, font })
      page.drawText(`Rs. ${Number(item.lineTotal).toLocaleString('en-IN')}`, { x: width - 150, y: currentY, size: 11, font })
      currentY -= 20
      
      if (item.discountNote) {
        page.drawText(`Note: ${item.discountNote}`, { x: 50, y: currentY, size: 10, font, color: rgb(0.4, 0.4, 0.4) })
        currentY -= 20
      }
    }
    
    // Draw Totals
    currentY -= 20
    page.drawLine({ start: { x: 50, y: currentY }, end: { x: width - 50, y: currentY }, thickness: 1 })
    currentY -= 20
    
    if (invoice.subtotal !== null && invoice.taxAmount !== null) {
      page.drawText('Base Price:', { x: width - 250, y: currentY, size: 12, font })
      page.drawText(`Rs. ${Number(invoice.subtotal).toLocaleString('en-IN')}`, { x: width - 150, y: currentY, size: 12, font })
      currentY -= 20
      
      page.drawText('GST (18%):', { x: width - 250, y: currentY, size: 12, font })
      page.drawText(`Rs. ${Number(invoice.taxAmount).toLocaleString('en-IN')}`, { x: width - 150, y: currentY, size: 12, font })
      currentY -= 20
    }
    
    page.drawText('Total:', { x: width - 250, y: currentY, size: 14, font: boldFont })
    page.drawText(`Rs. ${Number(invoice.total).toLocaleString('en-IN')}`, { x: width - 150, y: currentY, size: 14, font: boldFont })
    
    // Footer
    page.drawText('Thank you for choosing Sunshine Elder Care.', { x: 50, y: 50, size: 10, font })
    
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  }
}

export const pdfService = new PdfService()
