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

    const { user, profile } = session;

    // 1. Fetch Subscription & Care Plan Details
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
    let services: { serviceName: string; serviceNote: string | null }[] = [];

    if (subscription?.carePlanId && subscription?.variantType) {
      const variant = await db.carePlanVariant.findUnique({
        where: {
          carePlanId_variantType: {
            carePlanId: subscription.carePlanId,
            variantType: subscription.variantType,
          },
        },
        include: {
          services: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (variant) {
        services = variant.services.map((s) => ({
          serviceName: s.serviceName,
          serviceNote: s.serviceNote,
        }));
        hasEmergencyAssistant = services.some(
          (s) => s.serviceName === '24/7 Emergency Assistant'
        );
      }
    }

    // 2. Fetch Recent Receipts from database
    const receipts = await db.receipt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentMethod: true,
        relatedPlanName: true,
        createdAt: true,
      },
    });

    // 3. Construct Real Member Dashboard
    const memberName = user.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Sunshine Member';
    const memberId = profile?.memberId || 'PENDING_ASSIGNMENT';

    // Calculate days remaining
    let daysRemaining = 0;
    if (subscription?.endDate) {
      const diffMs = new Date(subscription.endDate).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json(
      {
        success: true,
        member: {
          id: user.id,
          memberId,
          name: memberName,
          email: user.email,
          phone: profile?.mobileNumber || profile?.phone || null,
          bloodGroup: profile?.bloodGroup || 'O+ (Default on file)',
          emergencyContact: {
            name: profile?.sponsor?.fullName || profile?.emergencyContactName || profile?.sponsorName || 'Primary Family Contact',
            phone: profile?.sponsor?.mobileNumber || profile?.emergencyContactPhone || profile?.sponsorPhone || '+91 90888 82222',
            relation: profile?.sponsor?.relationship || profile?.emergencyContactRelation || 'Family',
          },
          preferredHospital: profile?.medicalAuth?.hospitalForSos || profile?.hospitalPreference || 'Apollo Multispeciality Hospital, Kolkata',
        },
        membership: subscription
          ? {
              id: subscription.id,
              planName: subscription.carePlan?.name || 'Care Package',
              planSlug: subscription.carePlan?.slug || 'care-package',
              category: subscription.variantType === 'COUPLE' ? 'Couple Care' : 'Single Elder Care',
              variantType: subscription.variantType || 'SINGLE',
              status: subscription.status,
              startDate: subscription.startDate ? subscription.startDate.toISOString() : null,
              endDate: subscription.endDate ? subscription.endDate.toISOString() : null,
              daysRemaining,
              hasEmergencyAssistant,
              services,
            }
          : null,
        recentReceipts: receipts.map((r) => ({
          id: r.id,
          receiptNumber: r.receiptNumber,
          amount: Number(r.amount),
          date: r.createdAt.toISOString(),
          method: r.paymentMethod || 'ONLINE',
          downloadUrl: `/api/receipts/${r.id}/download`,
        })),
        systemNotifications: [
          {
            id: 'notif_welcome',
            title: 'Welcome to Sunshine Member App',
            message: `Hello ${memberName}! Your official membership is active under Member ID: ${memberId}.`,
            date: new Date().toISOString(),
            read: false,
          },
          ...(daysRemaining > 0 && daysRemaining <= 30
            ? [
                {
                  id: 'notif_renewal',
                  title: 'Membership Renewal Approaching',
                  message: `Your active coverage expires in ${daysRemaining} days. Tap to renew early and lock in benefits.`,
                  date: new Date().toISOString(),
                  read: false,
                },
              ]
            : []),
        ],
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_DASHBOARD_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
