import { NextRequest, NextResponse } from 'next/server';
import { MobileAuthService } from '@/lib/services/mobile-auth';

export const dynamic = 'force-dynamic';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const body = await req.json();
    const { memberId, password } = body;

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const result = await MobileAuthService.authenticateWithMemberId(memberId, password, clientIp);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.statusCode || 401, headers: corsHeaders }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        member: result.member,
        subscription: result.subscription,
      },
      { status: 200, headers: corsHeaders }
    );

    // Set secure HttpOnly session cookie for web PWA clients
    if (result.token) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      };
      response.cookies.set('sunshine_member_session', result.token, cookieOptions);
      response.cookies.set('sunshine_member_token', result.token, cookieOptions);
    }

    return response;
  } catch (error) {
    console.error('[MOBILE_LOGIN_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again later.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

