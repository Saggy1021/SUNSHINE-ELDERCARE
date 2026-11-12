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

    // 1. Fetch current subscription history directly from existing backend data
    const subscriptions = await db.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        carePlan: true,
      },
    });

    const activeSub = subscriptions.find(
      (s) => s.status === 'ACTIVE' || s.status === 'EXPIRING'
    ) || subscriptions[0];

    return NextResponse.json(
      {
        success: true,
        currentMembership: activeSub
          ? {
              id: activeSub.id,
              planName: activeSub.carePlan?.name || 'Care Package',
              planSlug: activeSub.carePlan?.slug || 'care-package',
              category: activeSub.variantType === 'COUPLE' ? 'Couple Care' : 'Single Elder Care',
              variantType: activeSub.variantType || 'SINGLE',
              durationMonths: activeSub.durationMonths || 1,
              status: activeSub.status,
              startDate: activeSub.startDate ? activeSub.startDate.toISOString() : null,
              endDate: activeSub.endDate ? activeSub.endDate.toISOString() : null,
            }
          : null,
        history: subscriptions.map((s) => ({
          id: s.id,
          planName: s.carePlan?.name || 'Care Package',
          variantType: s.variantType || 'SINGLE',
          status: s.status,
          startDate: s.startDate ? s.startDate.toISOString() : null,
          endDate: s.endDate ? s.endDate.toISOString() : null,
          createdAt: s.createdAt.toISOString(),
        })),
        renewalUrl: 'https://www.sunshineeldercare.in/dashboard/renew',
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_MEMBERSHIP_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
