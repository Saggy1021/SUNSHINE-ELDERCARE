import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db as prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AuthorizationService } from "@/lib/services/authorization";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await AuthorizationService.can(session.user.id, PERMISSIONS.COMMUNICATION_VIEW);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { code: "asc" },
    include: { updatedBy: { select: { name: true } } },
  });

  return NextResponse.json(templates);
}
