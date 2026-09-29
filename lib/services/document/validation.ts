/**
 * Document validation — Phase 17.7 Security Module
 *
 * Provides server-side enforcement of:
 * 1. Approved document type allowlist (Blocker 5)
 * 2. Approved MIME type allowlist (Blocker 3)
 * 3. Magic-byte / file-signature validation (Blocker 3)
 * 4. File size limits
 *
 * This module is the SOLE source of truth for what is acceptable.
 * Neither the React form nor the browser MIME type is trusted.
 *
 * DO NOT add MEDICAL_REPORT or CARE_PLAN to the approved categories
 * without a separate phase approval and commensurate access controls.
 */

// ---------------------------------------------------------------------------
// Approved Document Types — Blocker 5
// ---------------------------------------------------------------------------

/**
 * Only these document types may be submitted through the admin upload UI.
 * System-generated types (INVOICE, RECEIPT) are reserved for internal sync
 * operations and may not be submitted through the upload API.
 */
export const APPROVED_UPLOAD_DOCUMENT_TYPES = [
  "CONTRACT",
  "ASSESSMENT",
  "OTHER",
] as const;

export type ApprovedUploadDocumentType = typeof APPROVED_UPLOAD_DOCUMENT_TYPES[number];

/**
 * All types that may exist as MemberDocument.documentType values,
 * including system-managed types created internally.
 */
export const ALL_DOCUMENT_TYPES = [
  "INVOICE",    // System: created by syncInvoiceDocument
  "RECEIPT",    // System: created by syncReceiptDocument
  "CONTRACT",   // Admin: uploadable
  "ASSESSMENT", // Admin: uploadable
  "OTHER",      // Admin: uploadable
] as const;

/**
 * Validate that a client-supplied documentType is in the approved upload set.
 * Throws with a safe generic message if invalid.
 */
export function validateDocumentType(rawType: unknown): ApprovedUploadDocumentType {
  if (typeof rawType !== "string") {
    throw new Error("Invalid document type");
  }
  const normalized = rawType.trim().toUpperCase();
  if (!(APPROVED_UPLOAD_DOCUMENT_TYPES as readonly string[]).includes(normalized)) {
    throw new Error(
      `Invalid document type. Allowed: ${APPROVED_UPLOAD_DOCUMENT_TYPES.join(", ")}`
    );
  }
  return normalized as ApprovedUploadDocumentType;
}

// ---------------------------------------------------------------------------
// Approved MIME Types — Blocker 3
// ---------------------------------------------------------------------------

export const APPROVED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type ApprovedMimeType = typeof APPROVED_MIME_TYPES[number];

/**
 * Validate that a client-supplied MIME type is in the approved set.
 * NOTE: This alone is insufficient — magic bytes must also be checked.
 */
export function validateMimeType(rawMime: unknown): ApprovedMimeType {
  if (typeof rawMime !== "string") {
    throw new Error("Invalid file type");
  }
  const normalized = rawMime.trim().toLowerCase();
  if (!(APPROVED_MIME_TYPES as readonly string[]).includes(normalized)) {
    throw new Error(
      `File type not permitted. Allowed types: PDF, JPEG, PNG`
    );
  }
  return normalized as ApprovedMimeType;
}

// ---------------------------------------------------------------------------
// File Magic Byte Signatures — Blocker 3
// ---------------------------------------------------------------------------

/**
 * Magic byte signatures for each approved MIME type.
 * These are checked against the actual file buffer, independent of browser MIME.
 */
const MAGIC_BYTES: Record<ApprovedMimeType, { offset: number; bytes: number[] }[]> = {
  "application/pdf": [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  "image/jpeg": [
    { offset: 0, bytes: [0xFF, 0xD8, 0xFF] }, // JFIF / Exif / JPEG start
  ],
  "image/png": [
    { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }, // PNG signature
  ],
};

/**
 * Validate that a file buffer matches the magic bytes for the claimed MIME type.
 *
 * Ensures that:
 * - A file claiming to be PDF actually starts with %PDF
 * - A file claiming to be JPEG actually starts with FF D8 FF
 * - A file claiming to be PNG actually starts with the 8-byte PNG signature
 *
 * This prevents a malicious actor from uploading HTML or executable content
 * with a spoofed MIME type.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: ApprovedMimeType): void {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) {
    throw new Error("File type validation not configured for this MIME type");
  }

  for (const sig of signatures) {
    const slice = buffer.slice(sig.offset, sig.offset + sig.bytes.length);
    const matches = sig.bytes.every((b, i) => slice[i] === b);
    if (matches) {
      return; // At least one signature matched
    }
  }

  throw new Error(
    "File content does not match the declared file type. " +
    "Only genuine PDF, JPEG, and PNG files are accepted."
  );
}

// ---------------------------------------------------------------------------
// File Size Limit
// ---------------------------------------------------------------------------

/**
 * Maximum permitted upload size: 10 MB.
 * Prevents memory exhaustion and storage abuse.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds the maximum permitted size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
    );
  }
  if (buffer.length === 0) {
    throw new Error("File is empty");
  }
}

// ---------------------------------------------------------------------------
// Combined Validation Entry Point
// ---------------------------------------------------------------------------

/**
 * Perform all server-side validation on an uploaded file.
 *
 * Call this BEFORE passing any data to the storage layer.
 *
 * @param rawDocumentType - client-supplied documentType string
 * @param rawMimeType - client-supplied MIME type (from browser or form)
 * @param buffer - actual file bytes
 * @returns validated documentType and mimeType
 */
export function validateUpload(
  rawDocumentType: unknown,
  rawMimeType: unknown,
  buffer: Buffer
): { documentType: ApprovedUploadDocumentType; mimeType: ApprovedMimeType } {
  // 1. Document type allowlist
  const documentType = validateDocumentType(rawDocumentType);

  // 2. File size limit
  validateFileSize(buffer);

  // 3. MIME type allowlist
  const mimeType = validateMimeType(rawMimeType);

  // 4. Magic byte signature validation
  validateMagicBytes(buffer, mimeType);

  return { documentType, mimeType };
}
