import { NextRequest, NextResponse } from 'next/server';
import { MobileAuthService } from '@/lib/services/mobile-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: user.id,
          memberId: profile?.memberId || 'PENDING_ASSIGNMENT',
          name: user.name || 'Member',
          email: user.email,
          phone: profile?.mobileNumber || profile?.phone || '',
          addressLine1: profile?.serviceAddress || profile?.addressLine1 || profile?.address || '',
          city: profile?.city || 'Kolkata',
          state: profile?.state || 'West Bengal',
          pincode: profile?.postalCode || profile?.pincode || '',
          bloodGroup: profile?.bloodGroup || '',
          medicalConditions: profile?.medicalConditions || 'None reported',
          allergies: profile?.allergies || 'No known allergies',
          hospitalPreference: profile?.medicalAuth?.hospitalForSos || profile?.hospitalPreference || '',
          emergencyContactName: profile?.sponsor?.fullName || profile?.emergencyContactName || profile?.sponsorName || '',
          emergencyContactPhone: profile?.sponsor?.mobileNumber || profile?.emergencyContactPhone || profile?.sponsorPhone || '',
          emergencyContactRelation: profile?.sponsor?.relationship || profile?.emergencyContactRelation || 'Family',
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_PROFILE_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(req: NextRequest) {
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
    const body = await req.json();

    // Permitted editable fields mapped directly to MemberProfile and related models
    const profileUpdate: any = {};
    if (typeof body.phone === 'string') profileUpdate.mobileNumber = body.phone.trim();
    if (typeof body.addressLine1 === 'string') profileUpdate.serviceAddress = body.addressLine1.trim();
    if (typeof body.bloodGroup === 'string') profileUpdate.bloodGroup = body.bloodGroup.trim();
    if (typeof body.medicalConditions === 'string') profileUpdate.medicalConditions = body.medicalConditions.trim();

    if (profile) {
      await db.memberProfile.update({
        where: { userId: user.id },
        data: {
          ...profileUpdate,
          ...(body.emergencyContactName || body.emergencyContactPhone
            ? {
                sponsor: {
                  upsert: {
                    create: {
                      fullName: (body.emergencyContactName || 'Family Contact').trim(),
                      mobileNumber: (body.emergencyContactPhone || '').trim(),
                      relationship: (body.emergencyContactRelation || 'Family').trim(),
                    },
                    update: {
                      ...(body.emergencyContactName ? { fullName: body.emergencyContactName.trim() } : {}),
                      ...(body.emergencyContactPhone ? { mobileNumber: body.emergencyContactPhone.trim() } : {}),
                      ...(body.emergencyContactRelation ? { relationship: body.emergencyContactRelation.trim() } : {}),
                    },
                  },
                },
              }
            : {}),
          ...(body.hospitalPreference
            ? {
                medicalAuth: {
                  upsert: {
                    create: {
                      hospitalForSos: body.hospitalPreference.trim(),
                    },
                    update: {
                      hospitalForSos: body.hospitalPreference.trim(),
                    },
                  },
                },
              }
            : {}),
        },
      });
    }

    return NextResponse.json(
      { success: true, message: 'Profile updated successfully.' },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[MOBILE_PROFILE_PUT_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500, headers: corsHeaders }
    );
  }
}

