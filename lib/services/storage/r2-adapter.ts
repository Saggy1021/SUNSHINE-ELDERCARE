import { StorageProvider } from "./types";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";

export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("R2 storage configuration is missing");
    }

    this.bucketName = bucketName;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
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
    const safeUserId = metadata.userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDocType = metadata.documentType.replace(/[^a-zA-Z0-9_-]/g, "_");
    const objectKey = `members/${safeUserId}/${safeDocType}/${uuidv4()}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: file,
      ContentType: metadata.mimeType,
      Metadata: {
        originalName: Buffer.from(metadata.fileName).toString("base64"), // safe encoding for metadata headers
      },
    });

    await this.client.send(command);
    return objectKey;
  }

  async getSignedUrl(key: string, requestedExpiresInSeconds?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    // Centralized TTL configuration with 15-minute default
    const configuredTtl = parseInt(process.env.R2_PRESIGNED_URL_TTL_SECONDS || "900", 10);
    // Hard maximum of 15 minutes to prevent misconfiguration or client-requested long expiry
    const MAX_TTL = 900;
    
    let expiresIn = Math.min(configuredTtl, MAX_TTL);
    
    if (requestedExpiresInSeconds && requestedExpiresInSeconds > 0) {
       // Never allow a client/caller to arbitrarily choose a longer expiry than the strict max
       expiresIn = Math.min(requestedExpiresInSeconds, expiresIn);
    }

    // This generates a secure, short-lived presigned URL that the client browser
    // can use to download the file directly from Cloudflare R2, bypassing Vercel completely.
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error("Empty response body from R2");
    }

    // Convert readable stream to buffer (used only when direct proxying is required)
    const stream = response.Body as Readable;
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.client.send(command);
  }
}
