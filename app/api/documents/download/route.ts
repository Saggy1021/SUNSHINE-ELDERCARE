import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { documentService } from "@/lib/services/document";
import { db as prisma } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { RateLimitService } from '@/lib/services/rate-limit'
import { storageService } from "@/lib/services/storage";

export async function GET(request: Request) {
  try {
    await RateLimitService.checkLimit('SENSITIVE_FILES')
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { 'Retry-After': error.retryAfterSeconds.toString() } })
    }
  }

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

    if (document.storageKey) {
      const signedUrl = await storageService.getSignedUrl(document.storageKey);
      
      // If the signed URL is external (S3/R2), issue a temporary redirect (HTTP 307)
      // This avoids Vercel's 4.5MB response size limit and delegates bandwidth to the object store.
      if (signedUrl.startsWith('http')) {
        return NextResponse.redirect(signedUrl, 307);
      }
    }

    // Otherwise, fallback to proxying the buffer (e.g., LocalStorage or dynamic Invoice PDF)
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
