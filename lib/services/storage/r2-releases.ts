import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface R2ReleaseConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export class R2ReleaseStorage {
  private static instance: R2ReleaseStorage | null = null;
  private client: S3Client | null = null;
  private bucketName: string;

  private constructor() {
    const accountId = process.env.R2_ACCOUNT_ID || "8d1f83e05a1f402128cb5944942611f9";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "2164fa879dc0fdcafb7815c01da9d745";
    const secretAccessKey =
      process.env.R2_SECRET_ACCESS_KEY || "3bf6a25551e7c9bb051ff7ec6c3a55e7680333ffa15008592cebcf3eeac216c6";
    this.bucketName = process.env.R2_BUCKET_NAME || "sunshine-documents-prod";

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  public static getInstance(): R2ReleaseStorage {
    if (!R2ReleaseStorage.instance) {
      R2ReleaseStorage.instance = new R2ReleaseStorage();
    }
    return R2ReleaseStorage.instance;
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Generates a canonical, immutable R2 object key for an application release.
   * e.g. releases/apps/member-app/Sunshine-Member-v1.0.5-b6-cf672287.apk
   */
  public generateReleaseObjectKey(
    appSlug: string,
    versionName: string,
    versionCode: number,
    sha256: string,
    originalFileName?: string
  ): string {
    const isMember = appSlug === "member-app" || originalFileName?.toLowerCase().includes("member");
    const isEmployee = appSlug === "employee-app" || originalFileName?.toLowerCase().includes("employee");
    const prefix = isMember ? "Sunshine-Member" : isEmployee ? "Sunshine-Employee" : appSlug;
    const safeVersion = (versionName || "1.0.0").replace(/[^a-zA-Z0-9._-]/g, "_");
    const shortSha = sha256 ? sha256.substring(0, 8) : Date.now().toString(36);
    const fileName = `${prefix}-v${safeVersion}-b${versionCode}-${shortSha}.apk`;
    return `releases/apps/${appSlug}/${fileName}`;
  }

  /**
   * Generates a presigned PUT URL allowing the client browser to upload large APK files
   * directly to Cloudflare R2, completely bypassing Vercel's 4.5MB serverless payload limit.
   */
  public async getPresignedUploadUrl(
    objectKey: string,
    contentType: string = "application/vnd.android.package-archive",
    expiresInSeconds: number = 1800 // 30 minutes for large uploads
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Cloudflare R2 storage client is not configured.");
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generates a presigned GET download URL allowing high-speed, direct CDN downloads
   * with guaranteed Content-Length, Content-Disposition, and byte-range support.
   */
  public async getPresignedDownloadUrl(
    objectKey: string,
    downloadFileName: string,
    expiresInSeconds: number = 3600 // 1 hour
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Cloudflare R2 storage client is not configured.");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ResponseContentType: "application/vnd.android.package-archive",
      ResponseContentDisposition: `attachment; filename="${downloadFileName}"`,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Verifies that a release object exists in Cloudflare R2 and returns its exact byte size.
   */
  public async headReleaseObject(objectKey: string): Promise<{
    exists: boolean;
    contentLength: number;
    contentType?: string;
    sha256?: string;
  }> {
    if (!this.client) return { exists: false, contentLength: 0 };

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const res = await this.client.send(command);
      return {
        exists: true,
        contentLength: res.ContentLength || 0,
        contentType: res.ContentType,
        sha256: res.Metadata?.sha256,
      };
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") {
        return { exists: false, contentLength: 0 };
      }
      console.warn(`[R2ReleaseStorage] headObject error for '${objectKey}':`, err?.message);
      return { exists: false, contentLength: 0 };
    }
  }

  /**
   * Directly uploads a binary buffer to Cloudflare R2.
   * Used by automated build pipelines, local scripts, and multipart fallback.
   */
  public async putReleaseObject(
    objectKey: string,
    buffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Cloudflare R2 storage client is not configured.");
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: "application/vnd.android.package-archive",
      Metadata: metadata,
    });

    await this.client.send(command);
  }

  /**
   * Fetches an object range or stream directly from R2.
   */
  public async getObjectSlice(objectKey: string, range?: string): Promise<{
    buffer: Buffer;
    totalSize: number;
    contentType: string;
  }> {
    if (!this.client) {
      throw new Error("Cloudflare R2 storage client is not configured.");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Range: range,
    });

    const res = await this.client.send(command);
    const stream = res.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      totalSize: res.ContentLength || buffer.length,
      contentType: res.ContentType || "application/vnd.android.package-archive",
    };
  }
  /**
   * Fetches the complete object buffer from Cloudflare R2.
   * Useful for release acceptance testing and binary verification.
   */
  public async getObjectBuffer(objectKey: string): Promise<Buffer> {
    const { buffer } = await this.getObjectSlice(objectKey);
    return buffer;
  }
}

export const r2ReleaseStorage = R2ReleaseStorage.getInstance();
