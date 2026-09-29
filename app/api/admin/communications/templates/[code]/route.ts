import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db as prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AuthorizationService } from "@/lib/services/authorization";

export async function PUT(request: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await AuthorizationService.can(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await request.json();
  const { subject, body, isActive, description } = data;

  if (!subject || !body) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const template = await prisma.emailTemplate.upsert({
    where: { code: params.code },
    update: {
      subject,
      body,
      isActive: isActive ?? true,
      description,
      updatedById: session.user.id,
    },
    create: {
      code: params.code,
      subject,
      body,
      isActive: isActive ?? true,
      description,
      updatedById: session.user.id,
    },
  });

  return NextResponse.json(template);
}
