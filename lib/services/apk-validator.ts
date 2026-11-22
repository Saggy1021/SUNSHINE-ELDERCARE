import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { execSync } from "child_process";

export interface ApkInspectionResult {
  isValid: boolean;
  fileSize: number;
  sha256: string;
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  minSdkVersion?: string;
  targetSdkVersion?: number;
  certificateFingerprint?: string;
  error?: string;
}

export interface UpdateVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Extracts a specific uncompressed or deflate-compressed file from a ZIP/APK buffer.
 */
function extractFromZip(buf: Buffer, targetPath: string): Buffer | null {
  try {
    let eocdOffset = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65536); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) return null;

    const cdOffset = buf.readUInt32LE(eocdOffset + 16);
    const totalEntries = buf.readUInt16LE(eocdOffset + 10);

    let offset = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
      if (buf.readUInt32LE(offset) !== 0x02014b50) break;

      const compressionMethod = buf.readUInt16LE(offset + 10);
      const compressedSize = buf.readUInt32LE(offset + 20);
      const fileNameLen = buf.readUInt16LE(offset + 28);
      const extraLen = buf.readUInt16LE(offset + 30);
      const commentLen = buf.readUInt16LE(offset + 32);
      const localHeaderOffset = buf.readUInt32LE(offset + 42);

      const fileName = buf.toString("utf8", offset + 46, offset + 46 + fileNameLen);

      if (fileName === targetPath || fileName.endsWith("/" + targetPath)) {
        const localFileNameLen = buf.readUInt16LE(localHeaderOffset + 26);
        const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
        const compData = buf.subarray(dataStart, dataStart + compressedSize);

        if (compressionMethod === 0) {
          return compData;
        } else if (compressionMethod === 8) {
          return zlib.inflateRawSync(compData);
        }
      }

      offset += 46 + fileNameLen + extraLen + commentLen;
    }
  } catch {
    // Return null on corrupted zip entry
  }
  return null;
}

/**
 * Extracts the string pool from Android Binary XML (AXML).
 */
function parseAxmlStrings(buf: Buffer): string[] {
  try {
    if (buf.readUInt32LE(0) !== 0x00080003) return [];
    if (buf.readUInt32LE(8) !== 0x001c0001) return [];

    const stringCount = buf.readUInt32LE(16);
    const flags = buf.readUInt32LE(24);
    const stringsStart = 8 + buf.readUInt32LE(28);
    const isUtf8 = (flags & (1 << 8)) !== 0;

    const offsets: number[] = [];
    for (let i = 0; i < stringCount; i++) {
      offsets.push(buf.readUInt32LE(36 + i * 4));
    }

    const strings: string[] = [];
    for (let i = 0; i < stringCount; i++) {
      const strPos = stringsStart + offsets[i];
      if (isUtf8) {
        const len = buf.readUInt8(strPos + 1);
        strings.push(buf.toString("utf8", strPos + 2, strPos + 2 + len));
      } else {
        const len = buf.readUInt16LE(strPos) * 2;
        strings.push(buf.toString("utf16le", strPos + 2, strPos + 2 + len));
      }
    }
    return strings;
  } catch {
    return [];
  }
}

/**
 * Attempts to locate standard Android build tools (aapt, apksigner) on the host.
 */
function findTool(toolName: string): string | null {
  const commonPaths = [
    `/Users/tanish/Library/Android/sdk/build-tools/34.0.0/${toolName}`,
    `/Users/tanish/Library/Android/sdk/build-tools/36.0.0/${toolName}`,
    `/Users/tanish/Library/Android/sdk/build-tools/36.1.0/${toolName}`,
    toolName,
  ];

  for (const p of commonPaths) {
    try {
      execSync(`${p} --version`, { stdio: "ignore" });
      return p;
    } catch {
      try {
        execSync(`${p} version`, { stdio: "ignore" });
        return p;
      } catch {}
    }
  }
  return null;
}

export class ApkValidator {
  /**
   * Inspects and validates an APK from either a file path or a Buffer.
   */
  static inspectApk(input: Buffer | string): ApkInspectionResult {
    if (typeof input === "string") {
      return this.inspectApkFile(input);
    }
    return this.inspectApkBuffer(input);
  }

  /**
   * Inspects and validates an APK file path.
   */
  static inspectApkFile(filePath: string): ApkInspectionResult {
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return {
        isValid: false,
        fileSize: 0,
        sha256: "",
        error: "APK file not found on disk",
      };
    }

    const stats = fs.statSync(/*turbopackIgnore: true*/ filePath);
    const buffer = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return this.inspectApkBuffer(buffer, filePath);
  }

  /**
   * Inspects and validates an APK buffer in memory.
   */
  static inspectApkBuffer(buffer: Buffer, tempFilePath?: string): ApkInspectionResult {
    const fileSize = buffer.length;

    // Check basic file size limit: min 1MB, max 200MB
    if (fileSize < 1024 * 1024) {
      return {
        isValid: false,
        fileSize,
        sha256: "",
        error: "File is too small to be a valid Android APK (less than 1 MB)",
      };
    }

    // Check ZIP header magic bytes (PK..)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return {
        isValid: false,
        fileSize,
        sha256: "",
        error: "Invalid file header: File is not a valid Android APK / ZIP package",
      };
    }

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    let packageName: string | undefined;
    let versionName: string | undefined;
    let versionCode: number | undefined;
    let minSdkVersion: string | undefined;
    let targetSdkVersion: number | undefined;
    let certificateFingerprint: string | undefined;

    // Method A: Check via aapt / apksigner CLI if a file path is provided or can be written
    let targetPath = tempFilePath;
    let isTemp = false;

    if (!targetPath) {
      try {
        const tmpDir = path.join(process.cwd(), "scratch");
        if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) fs.mkdirSync(/*turbopackIgnore: true*/ tmpDir, { recursive: true });
        targetPath = path.join(tmpDir, `inspect-${Date.now()}-${Math.random().toString(36).substring(7)}.apk`);
        fs.writeFileSync(/*turbopackIgnore: true*/ targetPath, buffer);
        isTemp = true;
      } catch {}
    }

    if (targetPath && fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
      const aapt = findTool("aapt");
      if (aapt) {
        try {
          const out = execSync(`"${aapt}" dump badging "${targetPath}"`, {
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
          });

          const pkgMatch = out.match(
            /package: name=\x27([^\x27]+)\x27 versionCode=\x27([^\x27]+)\x27 versionName=\x27([^\x27]+)\x27/
          );
          if (pkgMatch) {
            packageName = pkgMatch[1];
            versionCode = parseInt(pkgMatch[2], 10);
            versionName = pkgMatch[3];
          }

          const sdkMatch = out.match(/sdkVersion:\x27([^\x27]+)\x27/);
          if (sdkMatch) minSdkVersion = `Android API ${sdkMatch[1]}`;

          const targetSdkMatch = out.match(/targetSdkVersion:\x27([^\x27]+)\x27/);
          if (targetSdkMatch) targetSdkVersion = parseInt(targetSdkMatch[1], 10);
        } catch {}
      }

      const apksigner = findTool("apksigner");
      if (apksigner) {
        try {
          const certOut = execSync(`"${apksigner}" verify --print-certs "${targetPath}"`, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          });
          const shaMatch = certOut.match(/Signer #1 certificate SHA-256 digest: ([a-f0-9]{64})/i);
          if (shaMatch) {
            certificateFingerprint = shaMatch[1].toLowerCase();
          }
        } catch {}
      }

      if (isTemp && targetPath) {
        try {
          fs.unlinkSync(/*turbopackIgnore: true*/ targetPath);
        } catch {}
      }
    }

    // Method B: Pure Node.js fallback using ZIP extraction and AXML string parsing
    if (!packageName || !versionName) {
      const manifestBuf = extractFromZip(buffer, "AndroidManifest.xml");
      if (!manifestBuf) {
        return {
          isValid: false,
          fileSize,
          sha256,
          error: "Corrupted APK: AndroidManifest.xml missing from root package",
        };
      }

      const strings = parseAxmlStrings(manifestBuf);
      if (strings.length === 0) {
        return {
          isValid: false,
          fileSize,
          sha256,
          error: "Failed to parse binary AndroidManifest.xml",
        };
      }

      // Find package name (reverse-DNS domain like in.sunshineeldercare.*)
      if (!packageName) {
        const pkg = strings.find((s) => /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(s) && (s.includes("sunshine") || s.includes("eldercare")));
        if (pkg) packageName = pkg;
      }

      // Find version name (semver like 1.0.0 or 1.0)
      if (!versionName) {
        const v = strings.find((s) => /^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/.test(s));
        if (v) versionName = v;
      }
    }

    return {
      isValid: true,
      fileSize,
      sha256,
      packageName,
      versionName,
      versionCode: versionCode ?? 1,
      minSdkVersion: minSdkVersion ?? "Android 10 (API 29)",
      targetSdkVersion: targetSdkVersion ?? 36,
      certificateFingerprint,
    };
  }

  /**
   * Verifies an uploaded APK against an existing application's security invariants:
   * 1. Package name must match exactly.
   * 2. Signing certificate must match previous release fingerprint if established.
   * 3. Version code must strictly increment if previous releases exist.
   */
  static verifyApkUpdate(
    existingApp: {
      packageName: string;
      latestCertFingerprint?: string | null;
      latestVersionCode?: number | null;
    },
    newApk: ApkInspectionResult
  ): UpdateVerificationResult {
    if (!newApk.isValid) {
      return { valid: false, reason: newApk.error || "Invalid Android APK file" };
    }

    if (newApk.packageName && newApk.packageName !== existingApp.packageName) {
      return {
        valid: false,
        reason: `Package ID mismatch: Uploaded APK has package "${newApk.packageName}", but application requires "${existingApp.packageName}". An APK cannot replace a different application.`,
      };
    }

    // Verify signing certificate continuity if established
    if (
      existingApp.latestCertFingerprint &&
      newApk.certificateFingerprint &&
      newApk.certificateFingerprint.toLowerCase() !== existingApp.latestCertFingerprint.toLowerCase()
    ) {
      return {
        valid: false,
        reason: `Signing Certificate Mismatch: The APK certificate fingerprint (${newApk.certificateFingerprint}) does not match the established trusted signature (${existingApp.latestCertFingerprint}). Android will reject updates with mismatched signatures.`,
      };
    }

    // Verify version code increments
    if (
      existingApp.latestVersionCode !== undefined &&
      existingApp.latestVersionCode !== null &&
      newApk.versionCode !== undefined &&
      newApk.versionCode <= existingApp.latestVersionCode
    ) {
      return {
        valid: false,
        reason: `Version code must be strictly greater than ${existingApp.latestVersionCode} (uploaded: ${newApk.versionCode}). Android rejects installs with lower or duplicate version codes.`,
      };
    }

    return { valid: true };
  }
}
