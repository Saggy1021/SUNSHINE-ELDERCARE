import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedId = searchParams.get('id');

    const hasMemberView = await AuthorizationService.can(session.user.id, "MEMBER_VIEW");
    const hasSensitiveView = await AuthorizationService.can(session.user.id, "MEMBER_SENSITIVE_VIEW");

    if (requestedId && requestedId !== session.user.id && !hasMemberView) {
        return NextResponse.json({ error: "Forbidden: You cannot access another member's profile" }, { status: 403 });
    }

    const targetUserId = (hasMemberView && requestedId) ? requestedId : session.user.id;

    const profile = await db.memberProfile.findUnique({
      where: { userId: targetUserId },
      include: {
        sponsor: true,
        insuranceDetails: true,
        medicalAuth: true,
      }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Exclude sensitive fields if not self and no sensitive view
    if (targetUserId !== session.user.id && !hasSensitiveView) {
        const { idProofNumber, ...safeProfile } = profile;
        return NextResponse.json(safeProfile);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

