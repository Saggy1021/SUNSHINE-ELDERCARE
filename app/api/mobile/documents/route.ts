import { NextRequest, NextResponse } from 'next/server';
import { MobileAuthService } from '@/lib/services/mobile-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const session = await MobileAuthService.verifySession(req.headers, req.cookies);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session is invalid or expired.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { user } = session;

    // Strict tenant isolation: Query only receipts belonging to the authenticated member
    const receipts = await db.receipt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentMethod: true,
        relatedPlanName: true,
        createdAt: true,
      },
    });

    const documents = receipts.map((r) => ({
      id: r.id,
      documentType: 'PAYMENT_RECEIPT',
      title: `Official Receipt #${r.receiptNumber}`,
      receiptNumber: r.receiptNumber,
      amount: Number(r.amount),
      currency: 'INR',
      issueDate: r.createdAt.toISOString(),
      paymentMethod: r.paymentMethod || 'ONLINE',
      planName: r.relatedPlanName || 'Sunshine Care Package',
      downloadUrl: `/api/receipts/${r.id}/download`,
    }));

    return NextResponse.json(
      {
        success: true,
        documents,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_DOCUMENTS_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
