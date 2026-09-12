import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLES, Role } from "./roles";

/**
 * Requires an authenticated user session.
 * Throws a Next.js redirect if unauthenticated.
 */
export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    role: (session.user.role as Role) || ROLES.USER,
    name: session.user.name,
  };
}

/**
 * Requires a specific role exactly.
 */
export async function requireRole(role: Role) {
  const user = await requireAuth();
  if (user.role !== role) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Requires the user to have any one of the allowed roles.
 */
export async function requireAnyRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Requires the authenticated user to be the owner of a resource, or an ADMIN.
 * Protects against IDOR by validating the target user ID against the session.
 */
export async function requireOwnership(ownerId: string) {
  const user = await requireAuth();
  
  // Admins can access any user's resources
  if (user.role === ROLES.ADMIN) {
    return user;
  }
  
  // Users can only access their own resources
  if (user.id !== ownerId) {
    redirect("/dashboard");
  }
  
  return user;
}

/**
 * Non-blocking helper to check if the current user has a specific role.
 * Safe to use in UI conditionally rendering.
 */
export async function hasRole(role: Role): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === role;
}

/**
 * Non-blocking helper to check if the current user has any of the allowed roles.
 */
export async function hasAnyRole(allowedRoles: Role[]): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role as Role);
}
