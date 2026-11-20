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

    const events = await db.communityEvent.findMany({
      where,
      orderBy: { eventDate: "desc" },
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error("[ADMIN_EVENTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess();
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      venue,
      imageUrl,
      visibleToAll = true,
      status = "PUBLISHED",
    } = body;

    if (!title || !description || !eventDate || !startTime || !venue) {
      return NextResponse.json(
        { error: "Title, description, event date, start time, and venue are required." },
        { status: 400 }
      );
    }

    const newEvent = await db.communityEvent.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        eventDate: new Date(eventDate),
        startTime: startTime.trim(),
        endTime: endTime ? endTime.trim() : null,
        venue: venue.trim(),
        imageUrl: imageUrl ? imageUrl.trim() : null,
        visibleToAll: Boolean(visibleToAll),
        status: status || "PUBLISHED",
      },
    });

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN_EVENTS_POST_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}
