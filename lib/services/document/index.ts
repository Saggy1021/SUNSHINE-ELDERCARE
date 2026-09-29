import { db as prisma } from "@/lib/db";
import { storageService } from "../storage";
import { InvoiceDocumentService } from "../invoice-document";
import { validateDocumentType, APPROVED_UPLOAD_DOCUMENT_TYPES } from "./validation";

/**
 * DocumentService — orchestrates member document storage and retrieval.
 *
 * Security contract:
 * - uploadDocument() enforces the approved document type allowlist
 *   at the service layer, regardless of which API route calls it.
 * - The service never constructs filesystem paths directly.
 *   All path logic lives in the StorageProvider implementation.
 * - The displayName (original filename) is stored as metadata only.
 *   It is never used as a filesystem path component.
 */
export const documentService = {
  async listUserDocuments(userId: string) {
    return prisma.memberDocument.findMany({
      where: { userId, status: "ACTIVE", visibility: "PRIVATE" },
      orderBy: { createdAt: "desc" },
    });
  },

  async getDocument(documentId: string) {
    return prisma.memberDocument.findUnique({
      where: { id: documentId },
      include: { invoice: true, receipt: true },
    });
  },

  async getDocumentContent(documentId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const doc = await this.getDocument(documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    if (doc.storageKey) {
      const buffer = await storageService.download(doc.storageKey);
      return { buffer, mimeType: doc.mimeType, fileName: doc.displayName };
    }

    if (doc.invoiceId) {
      const buffer = await InvoiceDocumentService.generateInvoicePdf(doc.invoiceId);
      return { buffer: Buffer.from(buffer), mimeType: "application/pdf", fileName: `${doc.displayName}.pdf` };
    }

    throw new Error("Document content could not be resolved");
  },

  /**
   * Upload a document for a member.
   *
   * @param userId       - owner (must be a valid User.id)
   * @param fileBuffer   - validated file bytes (caller must validate before passing here)
   * @param displayName  - human-readable name for display only (NOT used in path construction)
   * @param mimeType     - validated MIME type
   * @param documentType - must be in APPROVED_UPLOAD_DOCUMENT_TYPES
   * @param createdById  - admin user performing the upload
   */
  async uploadDocument(
    userId: string,
    fileBuffer: Buffer,
    displayName: string,
    mimeType: string,
    documentType: string,
    createdById: string
  ) {
    // Service-layer enforcement of the document type allowlist.
    // This prevents bypass via direct service calls that skip the API route.
    const validatedDocType = validateDocumentType(documentType);

    const key = await storageService.upload(fileBuffer, {
      fileName: displayName, // passed for metadata purposes; adapter uses UUID for path
      mimeType,
      userId,
      documentType: validatedDocType,
    });

    return prisma.memberDocument.create({
      data: {
        userId,
        documentType: validatedDocType,
        displayName,
        storageKey: key,
        mimeType,
        sizeBytes: fileBuffer.length,
        createdById,
        status: "ACTIVE",
        visibility: "PRIVATE",
      },
    });
  },

  /**
   * Sync an Invoice to a MemberDocument entry (lazy, idempotent).
   * This is a system-internal operation — documentType INVOICE is reserved.
   */
  async syncInvoiceDocument(invoiceId: string, userId: string, invoiceNumber: string) {
    const existing = await prisma.memberDocument.findUnique({ where: { invoiceId } });
    if (!existing) {
      return prisma.memberDocument.create({
        data: {
          userId,
          documentType: "INVOICE",
          displayName: `Invoice ${invoiceNumber}`,
          invoiceId,
          mimeType: "application/pdf",
          visibility: "PRIVATE",
        }
      });
    }
    return existing;
  },

  /**
   * Sync a Receipt to a MemberDocument entry (lazy, idempotent).
   * This is a system-internal operation — documentType RECEIPT is reserved.
   */
  async syncReceiptDocument(receiptId: string, userId: string, receiptNumber: string) {
    const existing = await prisma.memberDocument.findUnique({ where: { receiptId } });
    if (!existing) {
      return prisma.memberDocument.create({
        data: {
          userId,
          documentType: "RECEIPT",
          displayName: `Receipt ${receiptNumber}`,
          receiptId,
          mimeType: "application/pdf",
          visibility: "PRIVATE",
        }
      });
    }
    return existing;
  }
};
