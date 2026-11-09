import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { ReceiptDocumentService } from '@/lib/services/receipt-document'
import { RateLimitService } from '@/lib/services/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await RateLimitService.checkLimit('SENSITIVE_FILES')
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': error.retryAfterSeconds.toString() },
      })
    }
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await params

    const receipt = await db.receipt.findUnique({
      where: { id },
    })

    if (!receipt) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Strict ownership & administrative authorization check
    if (receipt.userId !== session.user.id) {
      const { AuthorizationService } = await import('@/lib/services/authorization')
      const canView = await AuthorizationService.can(session.user.id, 'PAYMENT_VIEW')
      if (!canView) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    const pdfBytes = await ReceiptDocumentService.generateReceiptPdf(receipt.id)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[RECEIPT_DOWNLOAD_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
