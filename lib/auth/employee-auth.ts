import { db } from "@/lib/db";
import crypto from "crypto";

export interface AuthenticatedEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  email: string | null;
  contactNumber: string | null;
  photoReference: string | null;
  status: string;
}

/**
 * Creates a cryptographically secure 30-day session for an employee.
 */
export async function createEmployeeSession(employeeId: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await db.employeeSession.create({
    data: {
      sessionToken,
      employeeId,
      expires,
    },
  });

  return sessionToken;
}

/**
 * Validates the Authorization Bearer token from the incoming request.
 * Server-side authoritative: never trusts any client-provided employeeId header or param.
 */
export async function getAuthenticatedEmployee(req: Request): Promise<{
  authenticated: boolean;
  employee?: AuthenticatedEmployee;
  sessionToken?: string;
  error?: string;
  statusCode?: number;
}> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      error: "Missing or invalid Authorization header. Bearer token required.",
      statusCode: 401,
    };
  }

  const sessionToken = authHeader.substring(7).trim();
  if (!sessionToken) {
    return {
      authenticated: false,
      error: "Empty bearer token.",
      statusCode: 401,
    };
  }

  const session = await db.employeeSession.findUnique({
    where: { sessionToken },
    include: {
      employee: true,
    },
  });

  if (!session) {
    return {
      authenticated: false,
      error: "Invalid or expired session. Please log in again.",
      statusCode: 401,
    };
  }

  // Check expiration
  if (new Date(session.expires) < new Date()) {
    await db.employeeSession.delete({ where: { id: session.id } }).catch(() => {});
    return {
      authenticated: false,
      error: "Session expired. Please log in again.",
      statusCode: 401,
    };
  }

  // Check employee active status
  if (!session.employee || session.employee.status !== "ACTIVE") {
    return {
      authenticated: false,
      error: "Employee account is inactive or not found.",
      statusCode: 403,
    };
  }

  return {
    authenticated: true,
    employee: {
      id: session.employee.id,
      employeeId: session.employee.employeeId,
      firstName: session.employee.firstName,
      lastName: session.employee.lastName,
      designation: session.employee.designation,
      email: session.employee.email,
      contactNumber: session.employee.contactNumber,
      photoReference: session.employee.photoReference,
      status: session.employee.status,
    },
    sessionToken,
  };
}

/**
 * Destroys an active employee session on logout.
 */
export async function destroyEmployeeSession(sessionToken: string): Promise<void> {
  await db.employeeSession.deleteMany({
    where: { sessionToken },
  });
}

/**
 * Mask an email address for privacy (e.g. j***@example.com)
 */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  return `${user[0]}${"*".repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
}
