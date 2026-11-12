import { NextRequest, NextResponse } from 'next/server';
import { MobileAuthService } from '@/lib/services/mobile-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const session = await MobileAuthService.verifySession(req.headers, req.cookies);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You must be signed in to trigger emergency SOS.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { user, profile } = session;
    const now = new Date();

    // 1. Authoritative Server-Side Subscription Eligibility Check
    const activeSubscriptions = await db.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'EXPIRING'] },
        startDate: { not: null, lte: now },
        endDate: { not: null, gte: now },
      },
      include: {
        carePlan: true,
      },
    });

    let hasEmergencyAssistant = false;
    let qualifyingPlanName = '';

    for (const sub of activeSubscriptions) {
      if (sub.carePlanId && sub.variantType) {
        const variant = await db.carePlanVariant.findUnique({
          where: {
            carePlanId_variantType: {
              carePlanId: sub.carePlanId,
              variantType: sub.variantType,
            },
          },
          include: { services: true },
        });

        if (variant?.services.some((s) => s.serviceName === '24/7 Emergency Assistant')) {
          hasEmergencyAssistant = true;
          qualifyingPlanName = sub.carePlan?.name || 'Care Package';
          break;
        }
      }
    }

    // If member has no active subscription with emergency assistant
    if (!hasEmergencyAssistant) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Emergency Assistant is not active on your current membership tier. For immediate distress guidance, please call our 24/7 Care Helpline.',
          helpline: '+91 90888 82222',
          nationalEmergency: '108',
          code: 'NON_QUALIFYING_MEMBERSHIP',
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 2. Parse client-submitted telemetry safely
    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, accuracy, clientTimestamp } = body;

    const memberId = profile?.memberId || 'SEC/MEMBER';
    const alertId = `SOS-${Date.now()}-${memberId.replace(/[^A-Za-z0-9]/g, '')}`;

    // 3. Persist Immutable Operational Audit Entry
    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'SOS_TRIGGERED',
        entityType: 'EMERGENCY_INCIDENT',
        entityId: alertId,
        metadata: {
          alertId,
          memberId,
          memberName: user.name || 'Member',
          phone: profile?.phone || 'Not on file',
          plan: qualifyingPlanName,
          coordinates: {
            latitude: typeof latitude === 'number' ? latitude : null,
            longitude: typeof longitude === 'number' ? longitude : null,
            accuracy: typeof accuracy === 'number' ? accuracy : null,
          },
          clientTimestamp: typeof clientTimestamp === 'string' ? clientTimestamp : new Date().toISOString(),
          serverTimestamp: now.toISOString(),
          emergencyContact: {
            name: profile?.emergencyContactName || profile?.sponsorName || 'Primary Family Contact',
            phone: profile?.emergencyContactPhone || profile?.sponsorPhone || '+91 90888 82222',
          },
        },
      },
    });

    // 4. Return Authorized Acknowledgment with Manual Operations Hotline
    return NextResponse.json(
      {
        success: true,
        alertId,
        message:
          'Emergency SOS alert confirmed. Sunshine Care Desk has received your signal. An emergency coordinator is calling you immediately.',
        helpline: '+91 90888 82222',
        nationalEmergency: '108',
        plan: qualifyingPlanName,
        timestamp: now.toISOString(),
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_SOS_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing SOS request' },
      { status: 500, headers: corsHeaders }
    );
  }
}
