import { PrismaClient } from "@prisma/client"

/**
 * DATABASE_URL guard — validated at runtime when first accessed, NOT at build time.
 * This allows Next.js static analysis and builds to proceed correctly even when
 * DATABASE_URL is not present in a CI/build-only environment.
 */

function redactAuditMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') return metadata;

  if (Array.isArray(metadata)) {
    return metadata.map(redactAuditMetadata);
  }

  const isSensitiveKey = (key: string): boolean => {
    const k = key.toLowerCase();

    // Explicit exclusions for common safe fields that might falsely trigger naive matchers
    if (k === 'publickey' || k === 'keyboard' || k === 'status') return false;

    // Direct matches for exact terms
    const exactMatches = ['token', 'tokenhash', 'token_hash', 'credential', 'credentials', 'password', 'secret', 'authorization'];
    if (exactMatches.includes(k)) return true;

    // Robust regex matching common variations of sensitive fields
    const sensitiveRegex = /password|secret|credential|authorization|api[-_]?key|private[-_]?key|signing[-_]?key|stripe[-_]?key|razorpay[-_]?signature|access[-_]?token|refresh[-_]?token|auth[-_]?token|csrf[-_]?token|auth[-_]?header/i;
    return sensitiveRegex.test(key);
  };

  const redacted = { ...metadata };
  for (const key of Object.keys(redacted)) {
    const value = redacted[key];
    const isObj = typeof value === 'object' && value !== null;

    if (isSensitiveKey(key)) {
      if (isObj && !Array.isArray(value)) {
        redacted[key] = redactAuditMetadata(value);
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (isObj) {
      redacted[key] = redactAuditMetadata(value);
    }
  }
  return redacted;
}

function createPrismaClient() {

  if (!process.env.DATABASE_URL) {
    // In production, this will throw clearly when a DB call is first attempted.
    // During static build analysis, no DB calls are made so this is safe.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[FATAL] DATABASE_URL environment variable is not set. " +
        "The application cannot connect to the database. " +
        "Set DATABASE_URL in your production environment before starting the server."
      )
    }
    // Still allow client creation — PrismaClient itself validates on connect
  }
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })
  client.$use(async (params, next) => {
    if (params.model === 'AuditLog') {
      if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
        const target = params.action === 'upsert' ? params.args.create : params.args.data;
        if (target && target.metadata) {
          target.metadata = redactAuditMetadata(target.metadata);
        }
        if (params.action === 'upsert' && params.args.update && params.args.update.metadata) {
          params.args.update.metadata = redactAuditMetadata(params.args.update.metadata);
        }
      } else if (params.action === 'createMany' || params.action === 'createManyAndReturn') {
        if (params.args && params.args.data) {
          const dataArray = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
          for (const item of dataArray) {
            if (item && item.metadata) item.metadata = redactAuditMetadata(item.metadata);
          }
        }
      } else if (params.action === 'updateMany') {
        if (params.args && params.args.data && params.args.data.metadata) {
          params.args.data.metadata = redactAuditMetadata(params.args.data.metadata);
        }
      }
    }
    return next(params);
  });
  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Singleton PrismaClient instance.
 *
 * All services MUST import `db` from this module.
 * Do NOT instantiate PrismaClient anywhere else in the codebase.
 * This prevents connection pool exhaustion during Next.js hot reload.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

