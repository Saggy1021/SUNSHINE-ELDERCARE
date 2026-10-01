import { StorageProvider } from "./types";
import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export class GoogleDriveStorageProvider implements StorageProvider {
  private drive: drive_v3.Drive;
  private parentFolderId: string;

  constructor() {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      throw new Error("Google Drive storage configuration is missing");
    }

    this.parentFolderId = folderId;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.drive = google.drive({ version: "v3", auth: oauth2Client });
  }

  /**
   * Helper: Find or create a subfolder inside a parent folder
   */
  private async findOrCreateFolder(folderName: string, parentId: string): Promise<string> {
    const query = `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await this.drive.files.list({
      q: query,
      fields: "files(id)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // Create the folder
    const createRes = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });

    return createRes.data.id!;
  }

  async upload(
    file: Buffer,
    metadata: {
      fileName: string;
      mimeType: string;
      userId: string;
      documentType: string;
    }
  ): Promise<string> {
    // We enforce logical structure: Parent -> Category -> User
    // Example: SUNSHINE ELDERCARE - PRIVATE DOCUMENTS -> MEMBERS -> {userId} -> {docType}
    const safeUserId = metadata.userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDocType = metadata.documentType.replace(/[^a-zA-Z0-9_-]/g, "_");

    // 1. Get/Create "Members" or appropriate root category. For simplicity, we just use documentType as root category.
    // Actually, structure: Parent -> Members -> userId -> documentType is good, but let's keep it simpler for now
    // Parent -> safeDocType -> safeUserId
    const docTypeFolderId = await this.findOrCreateFolder(safeDocType, this.parentFolderId);
    const userFolderId = await this.findOrCreateFolder(safeUserId, docTypeFolderId);

    const storedFileName = uuidv4(); // Safe filename, original name stored in description/DB

    const media = {
      mimeType: metadata.mimeType,
      body: Readable.from(file),
    };

    const res = await this.drive.files.create({
      requestBody: {
        name: storedFileName, // Hide original filename from Google Drive UI (stored as description)
        description: metadata.fileName,
        parents: [userFolderId],
      },
      media: media,
      fields: "id",
    });

    if (!res.data.id) {
      throw new Error("Failed to upload file to Google Drive");
    }

    return res.data.id;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // Google Drive does not support native S3-like presigned URLs for arbitrary external downloads
    // without making the file public (which is prohibited).
    // Therefore, we MUST proxy the file through the application by returning a local route.
    return `/api/documents/download?key=${encodeURIComponent(key)}`;
  }

  async download(key: string): Promise<Buffer> {
    const res = await this.drive.files.get(
      { fileId: key, alt: "media" },
      { responseType: "stream" }
    );

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      res.data
        .on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
        .on("error", (err: Error) => reject(err))
        .on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(key: string): Promise<void> {
    await this.drive.files.delete({ fileId: key });
  }
}
