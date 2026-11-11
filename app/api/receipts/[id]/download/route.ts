import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { ReceiptDocumentService } from '@/lib/services/receipt-document'
import { RateLimitService } from '@/lib/services/rate-limit'

export const dynamic = 'force-dynamic'

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
      select: {
        id: true,
        userId: true,
        receiptNumber: true,
      },
    })

    if (!receipt) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Strict ownership & administrative financial permission check (IDOR mitigation)
    if (receipt.userId !== session.user.id) {
      const { AuthorizationService } = await import('@/lib/services/authorization')
      const canView = await AuthorizationService.can(session.user.id, 'PAYMENT_VIEW')
      if (!canView) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    const pdfBytes = await ReceiptDocumentService.generateReceiptPdf(receipt.id)
    const sanitizedReceiptNumber = receipt.receiptNumber.replace(/[^A-Za-z0-9_-]/g, '_')

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${sanitizedReceiptNumber}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[RECEIPT_DOWNLOAD_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
