import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AuthorizationService } from "@/lib/services/authorization";
import { documentService } from "@/lib/services/document";
import { validateUpload } from "@/lib/services/document/validation";
import { db as prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await AuthorizationService.can(session.user.id, PERMISSIONS.DOCUMENT_VIEW);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const where = userId ? { userId } : {};

  const documents = await prisma.memberDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, memberSequenceId: true } },
    }
  });

  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await AuthorizationService.can(session.user.id, PERMISSIONS.DOCUMENT_MANAGE);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const rawDocumentType = formData.get("documentType");

    if (!file || !userId || !rawDocumentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!userId.trim()) {
      return NextResponse.json({ error: "Invalid member" }, { status: 400 });
    }

    // Read the file buffer once
    const buffer = Buffer.from(await file.arrayBuffer());

    // -----------------------------------------------------------------------
    // Server-side validation — Blockers 3 & 5
    // validateUpload() enforces:
    //   - Approved document type allowlist (no MEDICAL_REPORT, CARE_PLAN)
    //   - File size limit (10 MB)
    //   - Approved MIME type allowlist (PDF, JPEG, PNG only)
    //   - Magic byte / file signature validation
    // Any invalid input throws an Error that is caught below and returned
    // as a 400 Bad Request — never as a 500.
    // -----------------------------------------------------------------------
    const { documentType, mimeType } = validateUpload(rawDocumentType, file.type, buffer);

    // The original filename is preserved only for display purposes.
    // It is NOT passed to the storage layer for use in path construction.
    const displayName = file.name ? file.name.replace(/[<>:"/\\|?*]/g, "_").substring(0, 255) : "document";

    const doc = await documentService.uploadDocument(
      userId.trim(),
      buffer,
      displayName, // display only — storage adapter uses UUID internally
      mimeType,
      documentType,
      session.user.id
    );

    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    // Validation errors are user-facing (400), infrastructure errors are 500
    const isValidationError = e.message && (
      e.message.startsWith("Invalid document type") ||
      e.message.startsWith("File type not permitted") ||
      e.message.startsWith("File content does not match") ||
      e.message.startsWith("File size exceeds") ||
      e.message.startsWith("File is empty") ||
      e.message.startsWith("Invalid member") ||
      e.message.startsWith("Missing")
    );
    return NextResponse.json(
      { error: e.message || "Upload failed" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
