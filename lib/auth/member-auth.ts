import { db } from "@/lib/db";
import crypto from "crypto";

export interface AuthenticatedMember {
  id: string; // User ID
  profileId: string; // MemberProfile ID
  memberId: string; // Business Member ID (e.g. SECD1001PRTY)
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  serviceAddress: string | null;
  nearestLandmark: string | null;
  status: string;
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

/**
 * Creates a cryptographically secure 30-day session for a member user.
 */
export async function createMemberSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

/**
 * Validates the Authorization Bearer token from the incoming request.
 * Server-side authoritative: only authenticates valid member profiles.
 */
export async function getAuthenticatedMember(req: Request): Promise<{
  authenticated: boolean;
  member?: AuthenticatedMember;
  sessionToken?: string;
  error?: string;
  statusCode?: number;
}> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      error: "Missing or invalid Authorization header. Bearer token required.",
      statusCode: 401,
    };
  }

  const sessionToken = authHeader.substring(7).trim();
  if (!sessionToken) {
    return {
      authenticated: false,
      error: "Empty bearer token.",
      statusCode: 401,
    };
  }

  const session = await db.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: {
          memberProfile: true,
        },
      },
    },
  });

  if (!session) {
    return {
      authenticated: false,
      error: "Invalid or expired session. Please log in again.",
      statusCode: 401,
    };
  }

  // Check expiration
  if (new Date(session.expires) < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return {
      authenticated: false,
      error: "Session expired. Please log in again.",
      statusCode: 401,
    };
  }

  // Check user active status and member profile existence
  const user = session.user;
  if (!user || user.status !== "ACTIVE") {
    return {
      authenticated: false,
      error: "Member account is inactive or not found.",
      statusCode: 403,
    };
  }

  if (!user.memberProfile) {
    return {
      authenticated: false,
      error: "No member profile associated with this account.",
      statusCode: 403,
    };
  }

  const profile = user.memberProfile;

  // Resolve current active/latest subscription
  const currentSub = await db.subscription.findFirst({
    where: {
      userId: user.id,
      status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      carePlan: true,
    },
  });

  let hasEmergencyAssistant = true; // All members have 24/7 Emergency Assistant
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
    if (variant?.services) {
      hasEmergencyAssistant = variant.services.some(
        (s) => s.serviceName === "24/7 Emergency Assistant" || s.serviceName?.includes("Emergency")
      );
    }
  }

  const fullName = [profile.salutation, profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || user.name || "Sunshine Member";

  return {
    authenticated: true,
    member: {
      id: user.id,
      profileId: profile.id,
      memberId: profile.memberId || "MEMBER",
      name: fullName,
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      email: profile.email || user.email,
      phone: profile.mobileNumber || profile.alternateNumber || null,
      gender: profile.gender,
      serviceAddress: profile.serviceAddress,
      nearestLandmark: profile.nearestLandmark,
      status: user.status,
      subscription: currentSub
        ? {
            id: currentSub.id,
            planName: currentSub.carePlan?.name || "Care Plan",
            planSlug: currentSub.carePlan?.slug || "care-plan",
            variantType: currentSub.variantType || "SINGLE",
            status: currentSub.status,
            startDate: currentSub.startDate ? currentSub.startDate.toISOString() : null,
            endDate: currentSub.endDate ? currentSub.endDate.toISOString() : null,
            hasEmergencyAssistant,
          }
        : null,
    },
    sessionToken,
  };
}

/**
 * Destroys an active member session on logout.
 */
export async function destroyMemberSession(sessionToken: string): Promise<void> {
  await db.session.deleteMany({
    where: { sessionToken },
  });
}

/**
 * Mask an email address for privacy (e.g. p***e@example.com)
 */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  return `${user[0]}${"*".repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
}
