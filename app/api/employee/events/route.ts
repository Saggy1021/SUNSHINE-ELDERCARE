import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import { db } from "@/lib/db";
import { formatDateIST } from "@/lib/services/duty";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedEmployee(req);
    if (!auth.authenticated || !auth.employee) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const todayIST = new Date();
    todayIST.setHours(0, 0, 0, 0);

    const events = await db.communityEvent.findMany({
      where: {
        status: "PUBLISHED",
        eventDate: { gte: todayIST },
        audience: { in: ["EVERYONE", "EMPLOYEES_ONLY"] },
      },
      orderBy: { eventDate: "asc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      events: events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        eventDate: ev.eventDate.toISOString(),
        eventDateDisplay: formatDateIST(ev.eventDate),
        startTime: ev.startTime,
        endTime: ev.endTime,
        venue: ev.venue,
        imageUrl: ev.imageUrl,
        audience: ev.audience,
      })),
    });
  } catch (error: any) {
    console.error("[EMPLOYEE_EVENTS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}
