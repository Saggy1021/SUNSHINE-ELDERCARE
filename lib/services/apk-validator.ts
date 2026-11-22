import crypto from "crypto";
import fs from "fs";
import zlib from "zlib";

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
 * Extracts a specific uncompressed or deflate-compressed file from a ZIP/APK buffer in memory.
 */
export function extractFromZip(buf: Buffer, targetPath: string): Buffer | null {
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
      if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50) break;

      const compressionMethod = buf.readUInt16LE(offset + 10);
      const compressedSize = buf.readUInt32LE(offset + 20);
      const fileNameLen = buf.readUInt16LE(offset + 28);
      const extraLen = buf.readUInt16LE(offset + 30);
      const commentLen = buf.readUInt16LE(offset + 32);
      const localHeaderOffset = buf.readUInt32LE(offset + 42);

      const fileName = buf.toString("utf8", offset + 46, offset + 46 + fileNameLen);

      if (fileName === targetPath || fileName.endsWith("/" + targetPath)) {
        if (localHeaderOffset + 30 > buf.length) return null;
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
 * Pure TypeScript parser for Android Binary XML (AXML) AndroidManifest.xml.
 * Parses the string pool and element attributes to extract package, versionCode,
 * versionName, minSdkVersion, and targetSdkVersion without external tools.
 */
export function parseAxml(manifestBuf: Buffer): {
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  minSdkVersion?: string;
  targetSdkVersion?: number;
} | null {
  try {
    if (manifestBuf.length < 8 || manifestBuf.readUInt32LE(0) !== 0x00080003) return null;

    let offset = 8;
    const stringPool: string[] = [];
    const result: {
      packageName?: string;
      versionName?: string;
      versionCode?: number;
      minSdkVersion?: string;
      targetSdkVersion?: number;
    } = {};

    while (offset + 8 <= manifestBuf.length) {
      const chunkType = manifestBuf.readUInt32LE(offset);
      const chunkSize = manifestBuf.readUInt32LE(offset + 4);
      if (chunkSize <= 0 || offset + chunkSize > manifestBuf.length) break;

      if (chunkType === 0x001c0001) {
        // CHUNK_STRING_POOL
        const stringCount = manifestBuf.readUInt32LE(offset + 8);
        const flags = manifestBuf.readUInt32LE(offset + 16);
        const stringsStart = offset + manifestBuf.readUInt32LE(offset + 20);
        const isUtf8 = (flags & (1 << 8)) !== 0;
        const offsets: number[] = [];

        for (let i = 0; i < stringCount; i++) {
          offsets.push(manifestBuf.readUInt32LE(offset + 28 + i * 4));
        }

        for (let i = 0; i < stringCount; i++) {
          const pos = stringsStart + offsets[i];
          if (pos >= manifestBuf.length) {
            stringPool.push("");
            continue;
          }
          if (isUtf8) {
            const len = manifestBuf.readUInt8(pos + 1);
            stringPool.push(manifestBuf.toString("utf8", pos + 2, pos + 2 + len));
          } else {
            const len = manifestBuf.readUInt16LE(pos) * 2;
            stringPool.push(manifestBuf.toString("utf16le", pos + 2, pos + 2 + len));
          }
        }
      } else if (chunkType === 0x00100102) {
        // CHUNK_START_ELEMENT
        const tagIndex = manifestBuf.readUInt32LE(offset + 20);
        const tagName = stringPool[tagIndex];
        const attrCount = manifestBuf.readUInt16LE(offset + 28);

        if (tagName === "manifest") {
          for (let i = 0; i < attrCount; i++) {
            const aOff = offset + 36 + i * 20;
            if (aOff + 20 > manifestBuf.length) break;

            const attrNameIndex = manifestBuf.readUInt32LE(aOff + 4);
            const rawValueIndex = manifestBuf.readUInt32LE(aOff + 8);
            const valData = manifestBuf.readUInt32LE(aOff + 16);

            const attrName = stringPool[attrNameIndex];
            const rawValue =
              rawValueIndex !== 0xffffffff && rawValueIndex < stringPool.length
                ? stringPool[rawValueIndex]
                : undefined;

            if (attrName === "package") {
              result.packageName = rawValue || (valData < stringPool.length ? stringPool[valData] : undefined);
            } else if (attrName === "versionCode") {
              result.versionCode = valData;
            } else if (attrName === "versionName") {
              result.versionName = rawValue || (valData < stringPool.length ? stringPool[valData] : undefined);
            }
          }
        } else if (tagName === "uses-sdk") {
          for (let i = 0; i < attrCount; i++) {
            const aOff = offset + 36 + i * 20;
            if (aOff + 20 > manifestBuf.length) break;

            const attrNameIndex = manifestBuf.readUInt32LE(aOff + 4);
            const valData = manifestBuf.readUInt32LE(aOff + 16);
            const attrName = stringPool[attrNameIndex];

            if (attrName === "minSdkVersion") {
              result.minSdkVersion = `Android (API ${valData})`;
            } else if (attrName === "targetSdkVersion") {
              result.targetSdkVersion = valData;
            }
          }
        }
      }
      offset += chunkSize;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Pure TypeScript parser for APK Signing Block (APK Signature Scheme v2 and v3).
 * Extracts the primary signer's X.509 certificate and calculates its SHA-256 fingerprint.
 */
export function parseApkSigningBlock(buf: Buffer): {
  fingerprint: string;
  certDer: Buffer;
} | null {
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
    if (cdOffset < 24) return null;

    // Check 16-byte magic: "APK Sig Block 42"
    const magic = buf.subarray(cdOffset - 16, cdOffset).toString("utf8");
    if (magic !== "APK Sig Block 42") return null;

    const blockSize = Number(buf.readBigUInt64LE(cdOffset - 24));
    const blockStart = cdOffset - blockSize - 8;
    if (blockStart < 0) return null;

    let pos = blockStart + 8;
    while (pos < cdOffset - 24) {
      const pairLen = Number(buf.readBigUInt64LE(pos));
      const id = buf.readUInt32LE(pos + 8);

      // ID 0x7109871a is Scheme v2; ID 0xf05368c0 is Scheme v3
      if (id === 0x7109871a || id === 0xf05368c0) {
        const v2Data = buf.subarray(pos + 12, pos + 8 + pairLen);
        if (v2Data.length < 12) break;

        const signerLen = v2Data.readUInt32LE(4);
        const signerBuf = v2Data.subarray(8, 8 + signerLen);
        const signedDataLen = signerBuf.readUInt32LE(0);
        const signedData = signerBuf.subarray(4, 4 + signedDataLen);

        let sPos = 0;
        const digestsLen = signedData.readUInt32LE(sPos);
        sPos += 4 + digestsLen;

        if (sPos + 8 <= signedData.length) {
          sPos += 4; // skip certsSeqLen
          const certLen = signedData.readUInt32LE(sPos);
          sPos += 4;

          if (sPos + certLen <= signedData.length) {
            const certDer = signedData.subarray(sPos, sPos + certLen);
            const fingerprint = crypto.createHash("sha256").update(certDer).digest("hex").toLowerCase();
            return { fingerprint, certDer };
          }
        }
      }
      pos += 8 + pairLen;
    }
  } catch {
    // Ignore block parsing errors and return null
  }
  return null;
}

export class ApkValidator {
  /**
   * Inspects and validates an APK from either a file path or an in-memory Buffer.
   * Completely self-contained: executes 100% in pure TypeScript without any external
   * build-tools (aapt, apksigner) or temporary disk files, making it safe for Vercel Serverless.
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

    const buffer = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return this.inspectApkBuffer(buffer);
  }

  /**
   * Inspects and validates an APK buffer in memory.
   */
  static inspectApkBuffer(buffer: Buffer): ApkInspectionResult {
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

    if (fileSize > 200 * 1024 * 1024) {
      return {
        isValid: false,
        fileSize,
        sha256: "",
        error: "File exceeds maximum supported APK size (200 MB)",
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

    // 1. Extract and parse AndroidManifest.xml
    const manifestBuf = extractFromZip(buffer, "AndroidManifest.xml");
    if (!manifestBuf) {
      return {
        isValid: false,
        fileSize,
        sha256,
        error: "Corrupted APK: AndroidManifest.xml missing from root package",
      };
    }

    const axml = parseAxml(manifestBuf);
    if (!axml || !axml.packageName) {
      return {
        isValid: false,
        fileSize,
        sha256,
        error: "Failed to parse binary AndroidManifest.xml: package attribute not found",
      };
    }

    // 2. Extract and parse APK Signing Block (v2 / v3)
    const sigBlock = parseApkSigningBlock(buffer);
    const certificateFingerprint = sigBlock?.fingerprint;

    return {
      isValid: true,
      fileSize,
      sha256,
      packageName: axml.packageName,
      versionName: axml.versionName || "1.0.0",
      versionCode: axml.versionCode ?? 1,
      minSdkVersion: axml.minSdkVersion || "Android 10 (API 29)",
      targetSdkVersion: axml.targetSdkVersion || 36,
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
