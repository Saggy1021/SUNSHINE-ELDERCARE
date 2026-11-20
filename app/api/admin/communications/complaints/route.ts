import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";

export const dynamic = "force-dynamic";

async function verifyAdminAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  const hasAccess =
    isOwner ||
    (await AuthorizationService.hasAdminPortalAccess(session.user.id, session.user.email));

  if (!hasAccess) {
    return { ok: false, status: 403, error: "Forbidden: Admin access required" };
  }

  return { ok: true, session };
}

export async function GET(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const [complaints, totalCount, newCount, inProgressCount, resolvedCount] =
      await Promise.all([
        db.memberComplaint.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        db.memberComplaint.count(),
        db.memberComplaint.count({ where: { status: "NEW" } }),
        db.memberComplaint.count({ where: { status: "IN_PROGRESS" } }),
        db.memberComplaint.count({ where: { status: "RESOLVED" } }),
      ]);

    return NextResponse.json({
      success: true,
      complaints,
      metrics: {
        totalCount,
        newCount,
        inProgressCount,
        resolvedCount,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_COMPLAINTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch member complaints" },
      { status: 500 }
    );
  }
}
