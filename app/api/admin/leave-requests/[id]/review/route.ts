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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, adminRemarks } = body;

    if (!action || !["APPROVE", "REJECT", "CANCEL"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be APPROVE, REJECT, or CANCEL." },
        { status: 400 }
      );
    }

    const result = await LeaveService.reviewLeaveRequest({
      requestId: id,
      adminUserId: authCheck.session!.user.id,
      action,
      adminRemarks,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ADMIN_LEAVE_REVIEW_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process leave decision" },
      { status: 500 }
    );
  }
}
