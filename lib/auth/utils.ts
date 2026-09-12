import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLES, Role } from "./roles";

/**
 * Requires an authenticated user session.
 * Throws a Next.js redirect if unauthenticated, or returns the secure user identity.
 */
export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    // Safely cast the role, defaulting to USER if undefined
    role: (session.user.role as Role) || ROLES.USER,
    name: session.user.name,
  };
}

/**
 * Requires a specific role or higher privileges.
 * Useful for server actions or server components.
 */
export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    // Return forbidden safe behavior
    redirect("/dashboard"); 
  }
  
  return user;
}
