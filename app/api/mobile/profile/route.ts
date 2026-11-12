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
          phone: profile?.phone || '',
          addressLine1: profile?.addressLine1 || profile?.address || '',
          city: profile?.city || 'Kolkata',
          state: profile?.state || 'West Bengal',
          pincode: profile?.pincode || '',
          bloodGroup: profile?.bloodGroup || '',
          medicalConditions: profile?.medicalConditions || 'None reported',
          allergies: profile?.allergies || 'No known allergies',
          hospitalPreference: profile?.hospitalPreference || '',
          emergencyContactName: profile?.emergencyContactName || profile?.sponsorName || '',
          emergencyContactPhone: profile?.emergencyContactPhone || profile?.sponsorPhone || '',
          emergencyContactRelation: profile?.emergencyContactRelation || 'Family',
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

    // Permitted editable fields only (prevent mutating email, role, memberId, status)
    const updateData: any = {};
    if (typeof body.phone === 'string') updateData.phone = body.phone.trim();
    if (typeof body.addressLine1 === 'string') updateData.addressLine1 = body.addressLine1.trim();
    if (typeof body.city === 'string') updateData.city = body.city.trim();
    if (typeof body.state === 'string') updateData.state = body.state.trim();
    if (typeof body.pincode === 'string') updateData.pincode = body.pincode.trim();
    if (typeof body.bloodGroup === 'string') updateData.bloodGroup = body.bloodGroup.trim();
    if (typeof body.hospitalPreference === 'string') updateData.hospitalPreference = body.hospitalPreference.trim();
    if (typeof body.emergencyContactName === 'string') updateData.emergencyContactName = body.emergencyContactName.trim();
    if (typeof body.emergencyContactPhone === 'string') updateData.emergencyContactPhone = body.emergencyContactPhone.trim();
    if (typeof body.emergencyContactRelation === 'string') updateData.emergencyContactRelation = body.emergencyContactRelation.trim();

    if (profile) {
      await db.memberProfile.update({
        where: { userId: user.id },
        data: updateData,
      });
    } else {
      await db.memberProfile.create({
        data: {
          userId: user.id,
          ...updateData,
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

