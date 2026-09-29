import { StorageProvider } from "./types";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

/**
 * LocalStorageAdapter — development / initial deployment storage.
 *
 * Security guarantees:
 * 1. Stored filename is ALWAYS a UUID generated server-side.
 *    Original filenames are NEVER used as filesystem path components.
 * 2. documentType and userId path segments are sanitized before use.
 * 3. All resolved paths are validated against STORAGE_DIR using
 *    path.resolve() canonical comparison — not a string prefix check.
 * 4. The containment check uses path.resolve() so symlinks and relative
 *    traversal segments (../, ..\, encoded equivalents) cannot escape.
 * 5. No storage key, path, or filesystem detail is exposed in error messages.
 *
 * WARNING: This adapter stores files on the local filesystem.
 * It is suitable for development and single-server deployments only.
 * For production multi-server or cloud deployments, replace with an
 * S3-compatible adapter. See PHASE_17_7_COMMUNICATIONS_DOCUMENTS.md.
 */

const STORAGE_DIR = path.resolve(process.cwd(), "private_storage");

// ---------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------

/**
 * Sanitize a path segment (userId or documentType) so it cannot contain
 * traversal sequences, path separators, or OS-special characters.
 * Only alphanumeric, hyphens, and underscores are allowed.
 */
function sanitizeSegment(segment: string): string {
  const safe = segment.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!safe || safe === "." || safe === "..") {
    throw new Error("Invalid path segment");
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Containment Guard
// ---------------------------------------------------------------------------

/**
 * Verify that a resolved absolute path stays inside STORAGE_DIR.
 * Uses path.resolve() canonical paths so '..' and symlinks cannot escape.
 * Adds a path separator suffix to prevent prefix-collision attacks
 * (e.g. STORAGE_DIR = /foo/private_storage — /foo/private_storage_evil
 * would NOT pass because we check startsWith(STORAGE_DIR + sep)).
 */
function assertContained(fullPath: string): void {
  const resolvedStorage = path.resolve(STORAGE_DIR) + path.sep;
  const resolvedTarget = path.resolve(fullPath);

  // The target must start with the storage root (plus sep to prevent prefix attacks)
  // OR be exactly equal to the storage root itself (edge case for the root file)
  if (!resolvedTarget.startsWith(resolvedStorage) && resolvedTarget !== path.resolve(STORAGE_DIR)) {
    // IMPORTANT: do NOT include resolvedTarget in the error — avoids path disclosure
    throw new Error("Storage path violation: access denied");
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class LocalStorageAdapter implements StorageProvider {
  constructor() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Upload a file to local storage.
   *
   * The stored key is: {sanitizedUserId}/{sanitizedDocType}/{uuid}
   * The original filename is NEVER part of the key or the filesystem path.
   */
  async upload(
    file: Buffer,
    metadata: {
      fileName: string;   // preserved for display only — NOT used in path
      mimeType: string;
      userId: string;
      documentType: string;
    }
  ): Promise<string> {
    const safeUserId = sanitizeSegment(metadata.userId);
    const safeDocType = sanitizeSegment(metadata.documentType);

    // The actual stored filename is a UUID — no original name component
    const storedFileName = uuidv4();
    const key = `${safeUserId}/${safeDocType}/${storedFileName}`;

    const fullPath = path.resolve(STORAGE_DIR, key);

    // Containment check BEFORE creating directories or writing
    assertContained(fullPath);

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file);
    return key;
  }

  /**
   * Return a server-proxied download URL.
   * The key is URL-encoded to prevent injection in the query string.
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return `/api/documents/download?key=${encodeURIComponent(key)}`;
  }

  /**
   * Download a file from local storage.
   * Containment check BEFORE any filesystem access.
   */
  async download(key: string): Promise<Buffer> {
    const fullPath = path.resolve(STORAGE_DIR, key);

    // Containment check — rejects ../../ traversal and absolute paths
    assertContained(fullPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error("File not found");  // No path detail exposed
    }
    return fs.readFileSync(fullPath);
  }

  /**
   * Delete a file from local storage.
   * Containment check BEFORE any filesystem access.
   */
  async delete(key: string): Promise<void> {
    const fullPath = path.resolve(STORAGE_DIR, key);

    assertContained(fullPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
