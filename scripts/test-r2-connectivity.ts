import { R2StorageProvider } from "../lib/services/storage/r2-adapter";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

async function run() {
  console.log("=== PHASE 19G R2 CONNECTIVITY TEST ===");

  if (!process.env.R2_SECRET_ACCESS_KEY) {
    console.error("❌ R2_SECRET_ACCESS_KEY is missing from environment.");
    process.exit(1);
  }

  const r2 = new R2StorageProvider();
  
  // We need the raw client to test HEAD directly since the interface doesn't expose HEAD
  const rawClient = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  
  const bucket = process.env.R2_BUCKET_NAME!;
  const testId = uuidv4();
  const testContent = Buffer.from(`phase19g connectivity test payload ${testId}`);
  const sha256 = crypto.createHash("sha256").update(testContent).digest("hex");
  
  let uploadedKey: string | null = null;
  
  try {
    // 1 & 2. Authentication & Upload
    console.log("1 & 2. Testing Authentication & Upload...");
    uploadedKey = await r2.upload(testContent, {
      fileName: `test-${testId}.txt`,
      mimeType: "text/plain",
      userId: "test-user-uuid",
      documentType: "TEST"
    });
    console.log(`✅ Upload successful. Key: ${uploadedKey}`);

    // 3 & 4. Read/HEAD and Verify SHA-256 (via download to get buffer)
    console.log("3 & 4. Testing Read/HEAD & SHA-256...");
    const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: uploadedKey });
    await rawClient.send(headCommand);
    console.log("✅ HEAD request successful. Object exists.");
    
    const downloadedBuffer = await r2.download(uploadedKey);
    const downloadedSha256 = crypto.createHash("sha256").update(downloadedBuffer).digest("hex");
    if (sha256 !== downloadedSha256) throw new Error("SHA-256 mismatch");
    console.log(`✅ Download & SHA-256 match (${sha256})`);

    // 5 & 6. Presigned GET URL Generation & Expiry Verification
    console.log("5 & 6. Testing Presigned URL Generation...");
    // Passing a very high requested TTL should be capped at 900 seconds
    const signedUrl = await r2.getSignedUrl(uploadedKey, 9999);
    
    if (signedUrl.includes(process.env.R2_SECRET_ACCESS_KEY!)) {
      throw new Error("SECRET ACCESS KEY LEAKED IN URL");
    }
    
    const urlObj = new URL(signedUrl);
    const expiresParam = urlObj.searchParams.get("X-Amz-Expires");
    if (!expiresParam || parseInt(expiresParam, 10) > 900) {
      throw new Error(`Presigned URL expiry is too high or missing: ${expiresParam}`);
    }
    console.log(`✅ Presigned URL generated securely (Expiry capped: ${expiresParam}s)`);

  } catch (err: any) {
    console.error("❌ Test Failed:", err.message);
    process.exitCode = 1;
  } finally {
    // 7 & 8. Delete and Verify Deletion
    if (uploadedKey) {
      console.log("7. Cleaning up test object...");
      try {
        await r2.delete(uploadedKey);
        console.log("✅ Object deleted.");
        
        console.log("8. Verifying object no longer exists...");
        try {
          const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: uploadedKey });
          await rawClient.send(headCommand);
          console.error("❌ Object STILL EXISTS after deletion!");
          process.exitCode = 1;
        } catch (e: any) {
          if (e.name === "NotFound") {
            console.log("✅ Verified object is gone (NotFound).");
          } else {
            console.error("❌ Unexpected error during HEAD verification:", e);
          }
        }
      } catch (err: any) {
        console.error("❌ Cleanup Failed:", err.message);
        process.exitCode = 1;
      }
    }
  }
}

run();
