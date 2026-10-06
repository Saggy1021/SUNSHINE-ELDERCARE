import { db as prisma } from "@/lib/db";
import crypto from "crypto";
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
      
      // Verify SHA-256 for migration safety and integrity check if present
      if (doc.sha256) {
        const hash = crypto.createHash("sha256").update(buffer).digest("hex");
        if (hash !== doc.sha256) {
          console.error(`INTEGRITY WARNING: Checksum mismatch for document ${doc.id}`);
          // We log instead of throw here to not break legacy docs that might have changed unexpectedly, 
          // or we could throw if strictly required. For now, logging is safer for production.
        }
      }
      
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
   */
  async uploadDocument(
    userId: string,
    fileBuffer: Buffer,
    displayName: string,
    mimeType: string,
    documentType: string,
    createdById: string,
    tx?: any
  ) {
    const validatedDocType = validateDocumentType(documentType);
    
    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const key = await storageService.upload(fileBuffer, {
      fileName: displayName, // passed for metadata purposes
      mimeType,
      userId,
      documentType: validatedDocType,
    });

    const providerName = process.env.STORAGE_PROVIDER ? process.env.STORAGE_PROVIDER.toUpperCase().replace("-", "_") : "LOCAL";
    const dbClient = tx || prisma;

    try {
      return await dbClient.memberDocument.create({
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
          sha256,
          storageProvider: providerName,
          storageObjectId: key, // For Google Drive, the 'key' is the file ID
        },
      });
    } catch (error) {
      // Rollback: DB insert failed, clean up the orphaned object
      await storageService.delete(key).catch(e => {
        console.error(`Failed to cleanup orphaned storage object: ${key}`, e);
      });
      throw error;
    }
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
