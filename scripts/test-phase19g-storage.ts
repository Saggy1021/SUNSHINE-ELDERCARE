import { R2StorageProvider } from "../lib/services/storage/r2-adapter";
import { GoogleDriveStorageProvider } from "../lib/services/storage/google-drive-adapter";
import { LocalStorageAdapter } from "../lib/services/storage/local-adapter";
import { storageService } from "../lib/services/storage";

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log("=== PHASE 19G: STORAGE SECURITY TESTS (R2/S3) ===");

  // 1. Storage Abstraction Contract
  console.log("\n--- ABSTRACTION TEST ---");
  assert(
    typeof storageService.upload === 'function',
    "StorageProvider exposes upload()"
  );
  assert(
    typeof storageService.download === 'function',
    "StorageProvider exposes download()"
  );
  assert(
    typeof storageService.getSignedUrl === 'function',
    "StorageProvider exposes getSignedUrl()"
  );
  assert(
    typeof storageService.delete === 'function',
    "StorageProvider exposes delete()"
  );

  // 2. Adapter Instantiation
  console.log("\n--- ADAPTER TEST ---");
  let r2Instantiated = false;
  try {
    process.env.R2_ACCOUNT_ID = "mock-account";
    process.env.R2_ACCESS_KEY_ID = "mock-key";
    process.env.R2_SECRET_ACCESS_KEY = "mock-secret";
    process.env.R2_BUCKET_NAME = "mock-bucket";
    
    const r2 = new R2StorageProvider();
    r2Instantiated = true;
  } catch (e: any) {
    console.error(e);
  }
  assert(r2Instantiated, "R2StorageProvider instantiates correctly with credentials");

  // 3. Prevent Environment Variable Leakage Test
  console.log("\n--- ENV LEAKAGE TEST ---");
  const nextConfigPath = require('fs').readFileSync('next.config.mjs', 'utf-8');
  assert(!nextConfigPath.includes('R2_SECRET_ACCESS_KEY'), "Next.js config does not expose storage credentials to client");

  console.log("\nAll Phase 19G Storage tests passed successfully! 🚀");
}

runTests().catch(e => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
