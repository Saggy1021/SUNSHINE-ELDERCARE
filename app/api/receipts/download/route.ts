import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
  const receiptId = searchParams.get("receiptId");

  if (!receiptId) {
    return NextResponse.json({ error: "receiptId is required" }, { status: 400 });
  }

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Authorization: User must be the owner, or an admin with PAYMENT_VIEW
    const isOwner = receipt.userId === session.user.id;
    const isAdmin = await AuthorizationService.can(session.user.id, PERMISSIONS.PAYMENT_VIEW);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const receiptWithDoc = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { document: true }
    });

    if (receiptWithDoc?.document?.storageKey) {
      const signedUrl = await storageService.getSignedUrl(receiptWithDoc.document.storageKey);
      
      // If the signed URL is external (S3/R2), issue a temporary redirect (HTTP 307)
      if (signedUrl.startsWith('http')) {
        return NextResponse.redirect(signedUrl, 307);
      }
    }

    // Otherwise, generate it dynamically if possible, or fail if not found
    try {
      const { ReceiptDocumentService } = await import('@/lib/services/receipt-document');
      const pdfBytes = await ReceiptDocumentService.generateReceiptPdf(receipt.id);

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${receipt.receiptNumber.replace(/\//g, '-')}.pdf"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        },
      });
    } catch (e: any) {
       return NextResponse.json({ error: "Failed to generate receipt: " + e.message }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
