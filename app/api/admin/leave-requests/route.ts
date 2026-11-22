import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { LeaveService } from "@/lib/services/leave";

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
    const status = searchParams.get("status") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const result = await LeaveService.getAdminLeaveRequests({
      status,
      employeeId,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ADMIN_LEAVE_REQUESTS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}
