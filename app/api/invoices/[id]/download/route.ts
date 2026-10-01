import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { pdfService } from '@/lib/services/pdf'
import { RateLimitService } from '@/lib/services/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await RateLimitService.checkLimit('SENSITIVE_FILES')
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': error.retryAfterSeconds.toString() } })
    }
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: true }
    })

    if (!invoice) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Strict ownership check
    if (invoice.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Optional: Only allow download of PAID invoices? Or DRAFT/ISSUED is okay too?
    // Let's allow downloading any invoice (e.g., as a proforma invoice before payment)

    const pdfBytes = await pdfService.generateInvoicePdf(invoice)

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber || invoice.referenceNumber}.pdf"`
      }
    })
  } catch (error) {
    console.error('[INVOICE_DOWNLOAD_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
