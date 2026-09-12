/**
 * Typed application error classes for Sunshine Elder Care.
 *
 * Rules:
 * - Use typed errors instead of generic Error for predictable handling.
 * - Production API responses MUST use safeSerialize() — never expose internals.
 * - Stack traces, SQL, env vars, and file paths must never reach the browser.
 */

// ─── Base Error ──────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, code: string, statusCode = 500, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    // Maintains proper prototype chain in ES5+
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ─── Domain Errors ───────────────────────────────────────────────────────────

/** Configuration or infrastructure issue that prevents operation */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR", 503)
  }
}

/** The requested resource was not found */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404)
  }
}

/** The request was malformed or contains invalid data */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400)
  }
}

/** The caller is not authenticated */
export class UnauthenticatedError extends AppError {
  constructor() {
    super("Authentication required", "UNAUTHENTICATED", 401)
  }
}

/** The caller does not have permission */
export class UnauthorizedError extends AppError {
  constructor(action?: string) {
    super(
      action ? `Not authorized to perform: ${action}` : "Access denied",
      "UNAUTHORIZED",
      403
    )
  }
}

/** A financial operation cannot proceed due to configuration */
export class TaxConfigurationPendingError extends AppError {
  constructor() {
    super(
      "Tax configuration is pending. A custom quotation is required before payment can proceed.",
      "TAX_CONFIGURATION_PENDING",
      503
    )
  }
}

/** An external service is unavailable */
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`Service temporarily unavailable: ${service}`, "SERVICE_UNAVAILABLE", 503)
  }
}

// ─── Safe Serialization ───────────────────────────────────────────────────────

export interface SafeApiError {
  error: {
    code: string
    message: string
    statusCode: number
  }
}

/**
 * Converts any error into a safe, client-facing response.
 *
 * - Operational AppErrors are passed through with their message.
 * - Unknown/unexpected errors are genericized to prevent leaking internals.
 * - Stack traces, SQL, file paths, env vars are NEVER included.
 */
export function safeSerialize(error: unknown): SafeApiError {
  if (error instanceof AppError && error.isOperational) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    }
  }

  // Unexpected / non-operational error — do not reveal details
  return {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
      statusCode: 500,
    },
  }
}
