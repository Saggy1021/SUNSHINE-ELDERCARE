import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure environment variables are loaded
const sessionFile = "/Users/tanish/Sunshine Web/.production-db-session.local";
if (fs.existsSync(sessionFile) && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("127.0.0.1"))) {
  try {
    const raw = fs.readFileSync(sessionFile, "utf8").trim();
    const match = raw.match(/^DATABASE_URL=["']?(.*?)["']?$/m) || [null, raw];
    const url = match[1]?.trim() || raw;
    if (url.startsWith("postgres")) {
      process.env.DATABASE_URL = url;
    }
  } catch {}
}

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  try {
    const lines = fs.readFileSync(envLocalPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).replace(/^["']|["']$/g, "").trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

import { r2ReleaseStorage } from "../lib/services/storage/r2-releases";

interface DownloadAuditResult {
  target: string;
  url: string;
  httpStatus: number;
  finalResponseUrl: string;
  contentType: string | null;
  contentLength: number;
  actualDownloadedBytes: number;
  sha256: string;
  isComplete: boolean;
  packageVersion?: string;
  packageCode?: number;
}

async function downloadAndAudit(target: string, initialUrl: string): Promise<DownloadAuditResult> {
  const chunks: Buffer[] = [];
  let httpStatus = 0;
  let finalUrl = initialUrl;
  let contentType: string | null = null;
  let contentLength = 0;

  try {
    const res = await fetch(initialUrl, {
      headers: {
        "User-Agent": "SunshineMemberApp/1.0.2 (Build 3; Android 14)",
        "Accept": "application/vnd.android.package-archive, application/octet-stream, */*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    httpStatus = res.status;
    finalUrl = res.url;
    contentType = res.headers.get("content-type");
    contentLength = parseInt(res.headers.get("content-length") || "0", 10);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const downloadedBytes = buffer.length;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const isComplete = contentLength > 0 ? downloadedBytes === contentLength : downloadedBytes > 0;

    return {
      target,
      url: initialUrl,
      httpStatus,
      finalResponseUrl: finalUrl,
      contentType,
      contentLength,
      actualDownloadedBytes: downloadedBytes,
      sha256,
      isComplete,
    };
  } catch (err: any) {
    return {
      target,
      url: initialUrl,
      httpStatus,
      finalResponseUrl: finalUrl,
      contentType,
      contentLength,
      actualDownloadedBytes: 0,
      sha256: "ERROR: " + err.message,
      isComplete: false,
    };
  }
}

async function main() {
  console.log("================================================================");
  console.log("PHASE 2: COMPREHENSIVE 4-TARGET BINARY AUDIT");
  console.log("================================================================\n");

  // Step 1: Read Manifest
  console.log("Fetching live manifest from https://www.sunshineeldercare.in/api/apps/member-app/manifest...");
  const manifestRes = await fetch("https://www.sunshineeldercare.in/api/apps/member-app/manifest");
  const manifest = await manifestRes.json();
  console.log("Manifest Response:", JSON.stringify(manifest, null, 2));

  const manifestDownloadUrl = manifest.apkDownloadUrl;
  const manifestExpectedSha256 = manifest.sha256;
  const manifestExpectedSize = manifest.fileSize;

  // Target A: Official website download endpoint
  console.log("\n[Auditing Target A: Official website download endpoint]");
  const resultA = await downloadAndAudit("Target A: Official Website Endpoint", "https://www.sunshineeldercare.in/api/apps/member-app/download");

  // Target B: Exact URL returned by the manifest
  console.log("[Auditing Target B: Exact URL returned by the manifest]");
  const resultB = await downloadAndAudit("Target B: Manifest Download URL", manifestDownloadUrl);

  // Target C: Final redirected URL used by the Android updater
  console.log("[Auditing Target C: Final redirected URL used by the Android updater]");
  const resultC = await downloadAndAudit("Target C: Final Redirected URL", "https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-Release.apk");

  // Target D: The R2 object directly
  console.log("[Auditing Target D: The R2 object directly]");
  let resultD: DownloadAuditResult;
  try {
    const r2Key = "releases/apps/member-app/Sunshine-Member-Release.apk";
    const head = await r2ReleaseStorage.headReleaseObject(r2Key);
    const presigned = await r2ReleaseStorage.getPresignedDownloadUrl(r2Key, "Sunshine-Member-Release.apk", 300);
    const resD = await fetch(presigned);
    const bufD = Buffer.from(await resD.arrayBuffer());
    const shaD = crypto.createHash("sha256").update(bufD).digest("hex");
    const redactedUrl = presigned.split("?")[0] + "?[REDACTED_SIG]";

    resultD = {
      target: "Target D: Direct Cloudflare R2 Object",
      url: `r2://${r2ReleaseStorage.getBucketName()}/${r2Key}`,
      httpStatus: resD.status,
      finalResponseUrl: redactedUrl,
      contentType: resD.headers.get("content-type"),
      contentLength: parseInt(resD.headers.get("content-length") || "0", 10),
      actualDownloadedBytes: bufD.length,
      sha256: shaD,
      isComplete: bufD.length === head.contentLength,
    };
  } catch (err: any) {
    resultD = {
      target: "Target D: Direct Cloudflare R2 Object",
      url: "r2://sunshine-documents-prod/releases/apps/member-app/Sunshine-Member-Release.apk",
      httpStatus: 0,
      finalResponseUrl: "N/A",
      contentType: null,
      contentLength: 0,
      actualDownloadedBytes: 0,
      sha256: "ERROR: " + err.message,
      isComplete: false,
    };
  }

  const results = [resultA, resultB, resultC, resultD];

  console.log("\n================================================================");
  console.log("AUDIT RESULTS TABLE");
  console.log("================================================================\n");

  for (const r of results) {
    console.log(`--- ${r.target} ---`);
    console.log(`Initial URL:         ${r.url}`);
    console.log(`HTTP Status:         ${r.httpStatus}`);
    console.log(`Final Response URL:  ${r.finalResponseUrl}`);
    console.log(`Content-Type:        ${r.contentType}`);
    console.log(`Content-Length:      ${r.contentLength}`);
    console.log(`Downloaded Bytes:    ${r.actualDownloadedBytes}`);
    console.log(`SHA-256:             ${r.sha256}`);
    console.log(`Is Complete:         ${r.isComplete}`);
    console.log(`Matches Expected:    ${r.sha256 === manifestExpectedSha256 ? "YES (MATCH)" : "NO (MISMATCH)"}`);
    console.log("");
  }

  console.log("Authoritative Expected Checksum: " + manifestExpectedSha256);
  console.log("Authoritative Expected Size:     " + manifestExpectedSize + " bytes\n");
}

main().catch(console.error);
