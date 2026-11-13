import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { RateLimitService } from '@/lib/services/rate-limit';

// Constant-time execution mitigation for enumeration protection
const DUMMY_HASH = "$2a$10$w8uQe0bY8R4uU9m4F9w/u.bM/zHwS0E5V1q7xH0O9A3zX1sXwO0cK";

export interface MobileSessionPayload {
  sub: string;            // User ID
  memberId: string;       // Member ID (e.g. SEC/S/1001/SAKR)
  email: string;
  name: string;
  role: string;
  sessionVersion: number;
  iat: number;
  exp: number;
}

export interface MobileAuthResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  token?: string;
  member?: {
    id: string;
    memberId: string;
    name: string;
    email: string;
    phone: string | null;
    gender?: string | null;
    status: string;
  };
  subscription?: {
    id: string;
    planName: string;
    planSlug: string;
    variantType: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    hasEmergencyAssistant: boolean;
  } | null;
}

export class MobileAuthService {
  private static getSecret(): string {
    const secret = process.env.AUTH_SECRET?.trim();
    if (!secret) {
      throw new Error('AUTH_SECRET environment variable is required for mobile authentication but is not configured.');
    }
    return secret;
  }

  /**
   * Generates a tamper-proof signed JWT token for the mobile client.
   * Expiry: 30 days. Invalidation: tied to User.sessionVersion in database.
   */
  static signToken(payload: Omit<MobileSessionPayload, 'iat' | 'exp'>, expiresInDays = 30): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + (expiresInDays * 24 * 60 * 60);
    const fullPayload: MobileSessionPayload = { ...payload, iat, exp };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSecret())
      .update(`${header}.${encodedPayload}`)
      .digest('base64url');

    return `${header}.${encodedPayload}.${signature}`;
  }

  /**
   * Verifies a signed JWT token and decodes its payload.
   */
  static verifyToken(token: string): MobileSessionPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, encodedPayload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.getSecret())
        .update(`${header}.${encodedPayload}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const payload: MobileSessionPayload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8')
      );

      // Check expiry
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticates a member using their existing Sunshine Eldercare Member ID and website password.
   * Single account, single password, single database.
   */
  static async authenticateWithMemberId(
    identifierRaw: string,
    passwordRaw: string,
    clientIp?: string
  ): Promise<MobileAuthResult> {
    const identifier = (identifierRaw || '').trim();
    const password = (passwordRaw || '').trim();

    if (!identifier || !password) {
      return {
        success: false,
        error: 'Please enter your Member ID and password.',
        statusCode: 400,
      };
    }

    // 1. IP-level rate limiting to mitigate automated distributed brute forcing
    try {
      await RateLimitService.checkLimit('AUTHENTICATION', clientIp || identifier);
    } catch (e: any) {
      if (e?.name === 'RateLimitError') {
        return {
          success: false,
          error: 'Too many login attempts. Please wait 15 minutes before trying again.',
          statusCode: 429,
        };
      }
      // Non-fatal fallback: log warning and proceed if rate limit service store (e.g. Upstash) is unreachable or not configured
      console.warn('[MobileAuthService] RateLimitService non-fatal error:', e?.message || e);
    }

    // 2. Identify and retrieve User account
    let user: any = null;
    let memberProfile: any = null;

    const isEmail = identifier.includes('@');
    if (isEmail) {
      const normalizedEmail = identifier.toLowerCase();
      user = await db.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          memberProfile: true,
        },
      });
      memberProfile = user?.memberProfile;
    } else {
      // Lookup by Member ID (case-insensitive normalization)
      const cleanMemberId = identifier.toUpperCase();
      memberProfile = await db.memberProfile.findUnique({
        where: { memberId: cleanMemberId },
        include: {
          user: true,
        },
      });
      user = memberProfile?.user;
    }

    // 3. Constant-time password verification to prevent account enumeration
    const targetHash = user?.passwordHash || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, targetHash);

    if (!user || !isPasswordValid) {
      return {
        success: false,
        error: 'Invalid Member ID or password. Please verify your credentials.',
        statusCode: 401,
      };
    }

    // 4. Validate Account Status
    if (user.status !== 'ACTIVE') {
      if (user.status === 'SUSPENDED') {
        return {
          success: false,
          error: 'Your membership account is suspended. Please contact Sunshine Care Support at +91 90888 82222.',
          statusCode: 403,
        };
      }
      if (user.status === 'BLOCKED') {
        return {
          success: false,
          error: 'Your account is blocked. Please contact support.',
          statusCode: 403,
        };
      }
      if (user.status === 'PENDING_VERIFICATION') {
        return {
          success: false,
          error: 'Your account email has not been verified yet. Please complete verification on the Sunshine website.',
          statusCode: 403,
        };
      }
      return {
        success: false,
        error: 'Your account is inactive. Please contact support.',
        statusCode: 403,
      };
    }

    // 5. Ensure account is a member account (prevent admin privilege bleed into mobile client)
    if (user.role !== 'MEMBER') {
      return {
        success: false,
        error: 'Administrative accounts must access through the Sunshine Eldercare management portal.',
        statusCode: 403,
      };
    }

    const memberId = memberProfile?.memberId || 'PENDING_ASSIGNMENT';

    // 6. Generate signed mobile token
    const token = this.signToken({
      sub: user.id,
      memberId,
      email: user.email,
      name: user.name || 'Sunshine Member',
      role: user.role,
      sessionVersion: user.sessionVersion || 1,
    });

    // 7. Resolve current subscription status
    const currentSub = await db.subscription.findFirst({
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
    if (currentSub?.carePlanId && currentSub?.variantType) {
      const variant = await db.carePlanVariant.findUnique({
        where: {
          carePlanId_variantType: {
            carePlanId: currentSub.carePlanId,
            variantType: currentSub.variantType,
          },
        },
        include: {
          services: true,
        },
      });
      hasEmergencyAssistant = !!variant?.services.some(
        (s) => s.serviceName === '24/7 Emergency Assistant'
      );
    }

    return {
      success: true,
      token,
      member: {
        id: user.id,
        memberId,
        name: user.name || 'Sunshine Member',
        email: user.email,
        phone: memberProfile?.mobileNumber || memberProfile?.phone || null,
        gender: memberProfile?.gender || null,
        status: user.status,
      },
      subscription: currentSub
        ? {
            id: currentSub.id,
            planName: currentSub.carePlan?.name || 'Care Plan',
            planSlug: currentSub.carePlan?.slug || 'care-plan',
            variantType: currentSub.variantType || 'SINGLE',
            status: currentSub.status,
            startDate: currentSub.startDate ? currentSub.startDate.toISOString() : null,
            endDate: currentSub.endDate ? currentSub.endDate.toISOString() : null,
            hasEmergencyAssistant,
          }
        : null,
    };
  }

  /**
   * Authorizes an incoming request by verifying either:
   * 1. Authorization: Bearer <token>
   * 2. Cookie: sunshine_member_token
   * 3. Website NextAuth session
   *
   * Verifies against live database User.sessionVersion for immediate revocation.
   */
  static async verifySession(
    headers: Headers,
    cookies?: { get: (name: string) => { value: string } | undefined }
  ): Promise<{
    user: any;
    profile: any;
    memberId: string;
  } | null> {
    let token: string | null = null;

    // A. Check Authorization header
    const authHeader = headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // B. Check cookie (sunshine_member_session or sunshine_member_token)
    if (!token && cookies) {
      const cookieVal =
        cookies.get('sunshine_member_session')?.value ||
        cookies.get('sunshine_member_token')?.value;
      if (cookieVal) token = cookieVal;
    }

    // C. Decode and verify mobile token if present
    if (token) {
      const payload = this.verifyToken(token);
      if (!payload) return null;

      // Authoritative database verification: ensure user is ACTIVE and session not invalidated
      const user = await db.user.findUnique({
        where: { id: payload.sub },
        include: {
          memberProfile: {
            include: {
              sponsor: true,
              medicalAuth: true,
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') return null;
      if (user.sessionVersion !== payload.sessionVersion) return null; // Password changed or revoked

      return {
        user,
        profile: user.memberProfile,
        memberId: user.memberProfile?.memberId || payload.memberId,
      };
    }

    // D. Fall back to existing website NextAuth session if available
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      if (session?.user?.id) {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          include: {
            memberProfile: true,
          },
        });
        if (user && user.status === 'ACTIVE') {
          return {
            user,
            profile: user.memberProfile,
            memberId: user.memberProfile?.memberId || 'MEMBER',
          };
        }
      }
    } catch {
      // NextAuth fallback failed or not available in this context
    }

    return null;
  }
}

