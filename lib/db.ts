import { PrismaClient } from "@prisma/client"

/**
 * DATABASE_URL guard — validated at runtime when first accessed, NOT at build time.
 * This allows Next.js static analysis and builds to proceed correctly even when
 * DATABASE_URL is not present in a CI/build-only environment.
 */
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
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })
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
