import { NextRequest, NextResponse } from 'next/server';
import { MobileAuthService } from '@/lib/services/mobile-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const { user, profile } = session;

    // Fetch active subscription
    const subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'EXPIRING', 'SCHEDULED', 'EXPIRED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        carePlan: true,
      },
    });

    let hasEmergencyAssistant = false;
    if (subscription?.carePlanId && subscription?.variantType) {
      const variant = await db.carePlanVariant.findUnique({
        where: {
          carePlanId_variantType: {
            carePlanId: subscription.carePlanId,
            variantType: subscription.variantType,
          },
        },
        include: { services: true },
      });
      hasEmergencyAssistant = !!variant?.services.some(
        (s) => s.serviceName === '24/7 Emergency Assistant'
      );
    }

    return NextResponse.json(
      {
        success: true,
        member: {
          id: user.id,
          memberId: profile?.memberId || 'PENDING_ASSIGNMENT',
          name: user.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Member',
          email: user.email,
          phone: profile?.mobileNumber || profile?.phone || null,
          role: user.role,
          status: user.status,
          gender: profile?.gender || null,
          address: profile?.serviceAddress || profile?.addressLine1 || profile?.address || null,
          city: profile?.city || null,
          bloodGroup: profile?.bloodGroup || null,
          emergencyContactName: profile?.emergencyContactName || profile?.sponsorName || null,
          emergencyContactPhone: profile?.emergencyContactPhone || profile?.sponsorPhone || null,
          hospitalPreference: profile?.hospitalPreference || null,
        },
        subscription: subscription
          ? {
              id: subscription.id,
              planName: subscription.carePlan?.name || 'Care Plan',
              planSlug: subscription.carePlan?.slug || 'care-plan',
              variantType: subscription.variantType || 'SINGLE',
              durationMonths: subscription.durationMonths || 1,
              status: subscription.status,
              startDate: subscription.startDate ? subscription.startDate.toISOString() : null,
              endDate: subscription.endDate ? subscription.endDate.toISOString() : null,
              hasEmergencyAssistant,
            }
          : null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_AUTH_ME_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

