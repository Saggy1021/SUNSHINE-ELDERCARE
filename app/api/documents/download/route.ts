import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { documentService } from "@/lib/services/document";
import { db as prisma } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const docId = searchParams.get("docId");

  try {
    let document;

    if (docId) {
      document = await prisma.memberDocument.findUnique({ where: { id: docId } });
    } else if (key) {
      document = await prisma.memberDocument.findFirst({ where: { storageKey: key } });
    }

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Authorization: User must be the owner, or an admin with DOCUMENT_VIEW
    const isOwner = document.userId === session.user.id;
    const isAdmin = await AuthorizationService.can(session.user.id, PERMISSIONS.DOCUMENT_VIEW);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { buffer, mimeType, fileName } = await documentService.getDocumentContent(document.id);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
