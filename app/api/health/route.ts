import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * GET /api/health
 *
 * Public health check endpoint.
 * Returns application and database status.
 *
 * Safe response rules:
 * - Never expose DATABASE_URL, credentials, connection strings, or secrets.
 * - Never expose stack traces, SQL queries, or internal file paths.
 * - Return only the minimal status information required.
 *
 * HTTP status codes:
 * - 200 OK — application and database are healthy
 * - 503 Service Unavailable — database is unreachable
 */
export async function GET() {
  const startTime = Date.now()

  // Check database connectivity with a minimal query
  let dbStatus: "ok" | "unavailable" = "unavailable"
  let dbError: string | undefined

  try {
    // Raw query to avoid loading any business data
    await db.$queryRaw`SELECT 1`
    dbStatus = "ok"
  } catch (error) {
    // Log full error server-side for debugging — never send to client
    console.error("[health] Database connectivity check failed:", error instanceof Error ? error.message : "Unknown error")
    dbError = "Database is currently unreachable"
  }

  const responseTimeMs = Date.now() - startTime
  const isHealthy = dbStatus === "ok"

  const body = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    responseTimeMs,
    services: {
      database: {
        status: dbStatus,
        // Only include error message if unhealthy — never include credentials or SQL
        ...(dbError ? { reason: dbError } : {}),
      },
    },
  }

  return NextResponse.json(body, {
    status: isHealthy ? 200 : 503,
    headers: {
      // Prevent caching of health check responses
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
