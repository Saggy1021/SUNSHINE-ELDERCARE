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

export async function PUT(
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
    const { status, adminResponse, internalNotes, assignedTo } = body;

    const existing = await db.memberComplaint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === "RESOLVED" && existing.status !== "RESOLVED") {
        updateData.resolvedAt = new Date();
      } else if (status !== "RESOLVED") {
        updateData.resolvedAt = null;
      }
    }
    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse ? adminResponse.trim() : null;
    }
    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes ? internalNotes.trim() : null;
    }
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo ? assignedTo.trim() : null;
    }

    const updated = await db.memberComplaint.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, complaint: updated });
  } catch (error: any) {
    console.error("[ADMIN_COMPLAINTS_PUT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update complaint" },
      { status: 500 }
    );
  }
}
