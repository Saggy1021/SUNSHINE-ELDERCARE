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
    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      venue,
      imageUrl,
      visibleToAll,
      audience,
      status,
    } = body;

    const existing = await db.communityEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (startTime !== undefined) updateData.startTime = startTime.trim();
    if (endTime !== undefined) updateData.endTime = endTime ? endTime.trim() : null;
    if (venue !== undefined) updateData.venue = venue.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (visibleToAll !== undefined) updateData.visibleToAll = Boolean(visibleToAll);
    if (audience !== undefined) {
      updateData.audience = ["EVERYONE", "MEMBERS_ONLY", "EMPLOYEES_ONLY"].includes(audience)
        ? audience
        : "EVERYONE";
    }
    if (status !== undefined) updateData.status = status;

    const updated = await db.communityEvent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error("[ADMIN_EVENTS_PUT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await params;
    await db.communityEvent.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (error: any) {
    console.error("[ADMIN_EVENTS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}
