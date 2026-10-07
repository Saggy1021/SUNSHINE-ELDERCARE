/**
 * Server-side structured logger for Sunshine Eldercare.
 *
 * Rules:
 * - All logging goes through this module — never console.log directly in services.
 * - Never log passwords, tokens, payment secrets, database credentials, or PII.
 * - In production, use log level INFO and above only.
 * - Structured output is ready for ingestion by log aggregation platforms.
 */

type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLevel(): LogLevel {
  if (process.env.NODE_ENV === "production") return "info"
  return (process.env.LOG_LEVEL as LogLevel) ?? "debug"
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()]
}

/**
 * Strips known sensitive keys from log metadata before output.
 * Add keys here as new sensitive fields are identified.
 */
function sanitize(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const SENSITIVE_KEYS = [
    "password",
    "passwordHash",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "DATABASE_URL",
    "AUTH_SECRET",
    "PAYMENT_SECRET_KEY",
    "SMTP_PASS",
    "cardNumber",
    "cvv",
  ]
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    sanitized[key] = SENSITIVE_KEYS.includes(key) ? "[REDACTED]" : value
  }
  return sanitized
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitize(meta) } : {}),
  }

  // In production environments, structured JSON is preferred for log aggregators.
  // In development, human-readable output is more convenient.
  if (process.env.NODE_ENV === "production") {
    process.stdout.write(JSON.stringify(entry) + "\n")
  } else {
    const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : ""
    const output = `[${entry.timestamp}] ${level.toUpperCase()} ${message}${metaStr}`
    if (level === "error") {
      console.error(output)
    } else if (level === "warn") {
      console.warn(output)
    } else {
      console.log(output)
    }
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
}
