import { db } from "../db";
import { cache } from "react";

export class AuthorizationService {
  /**
   * Retrieves all permissions assigned to a user via their roles.
   * Memoized per request lifecycle to prevent duplicate N+1 queries.
   */
  static getUserPermissions = cache(async (userId: string): Promise<Set<string>> => {
    const userRoles = await db.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    const perms = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        perms.add(rp.permission.code);
      }
    }
    return perms;
  });

  /**
   * Checks if a user has a specific permission.
   * Optional userEmail short-circuits owner checks without database roundtrips.
   */
  static async can(userId: string, permissionCode: string, userEmail?: string | null): Promise<boolean> {
    if (userEmail !== undefined && userEmail !== null) {
      if (userEmail === 'info.sunshineeldercare@gmail.com') return true;
    } else {
      if (await this.isOwner(userId)) return true;
    }
    
    const permissions = await this.getUserPermissions(userId);
    return permissions.has(permissionCode);
  }

  /**
   * Requires a specific permission. Throws an error if not authorized.
   */
  static async require(userId: string, permissionCode: string, userEmail?: string | null): Promise<void> {
    const hasPerm = await this.can(userId, permissionCode, userEmail);
    if (!hasPerm) {
      throw new Error(`Unauthorized: Missing permission ${permissionCode}`);
    }
  }

  /**
   * Checks if a user has ALL of the given permissions.
   */
  static async requireAll(userId: string, permissionCodes: string[], userEmail?: string | null): Promise<void> {
    if (userEmail !== undefined && userEmail !== null) {
      if (userEmail === 'info.sunshineeldercare@gmail.com') return;
    } else {
      if (await this.isOwner(userId)) return;
    }

    const permissions = await this.getUserPermissions(userId);
    for (const code of permissionCodes) {
      if (!permissions.has(code)) {
        throw new Error(`Unauthorized: Missing permission ${code}`);
      }
    }
  }

  /**
   * Checks if a user has ANY of the given permissions.
   */
  static async requireAny(userId: string, permissionCodes: string[], userEmail?: string | null): Promise<void> {
    if (userEmail !== undefined && userEmail !== null) {
      if (userEmail === 'info.sunshineeldercare@gmail.com') return;
    } else {
      if (await this.isOwner(userId)) return;
    }

    const permissions = await this.getUserPermissions(userId);
    const hasAny = permissionCodes.some(code => permissions.has(code));
    if (!hasAny) {
      throw new Error(`Unauthorized: Requires at least one of [${permissionCodes.join(', ')}]`);
    }
  }

  /**
   * Checks if the user has the 'Owner' role.
   * Memoized per request lifecycle.
   */
  static isOwner = cache(async (userId: string): Promise<boolean> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    return user?.email === 'info.sunshineeldercare@gmail.com';
  });

  /**
   * Enforces that the user is an Owner
   */
  static async requireOwner(userId: string): Promise<void> {
    const isOwner = await this.isOwner(userId);
    if (!isOwner) {
      throw new Error("Unauthorized: Owner access required.");
    }
  }

  /**
   * Determines if a user should be routed to the Admin portal
   * based on having any core administrative permissions.
   */
  static async hasAdminPortalAccess(userId: string, userEmail?: string | null): Promise<boolean> {
    if (userEmail !== undefined && userEmail !== null) {
      if (userEmail === 'info.sunshineeldercare@gmail.com') return true;
    } else {
      if (await this.isOwner(userId)) return true;
    }
    
    // Core permissions that justify access to /admin
    const adminPerms = [
      'MEMBER_VIEW', 'EMPLOYEE_VIEW', 'ADMIN_USER_MANAGE', 'ROLE_MANAGE', 
      'CONTENT_VIEW', 'PAYMENT_VIEW', 'INVOICE_VIEW', 'DOCUMENT_VIEW',
      'INQUIRY_VIEW', 'FEEDBACK_VIEW', 'CARE_CASE_VIEW', 'PLAN_VIEW'
    ];
    
    const permissions = await this.getUserPermissions(userId);
    return adminPerms.some(p => permissions.has(p));
  }

  /**
   * Checks if user has access to EmergencyOS subportal.
   * Super Admins / Owners always have access.
   * Users with EMERGENCY_INCIDENT_VIEW or EMERGENCY_INCIDENT_OPERATE or EMERGENCY_INCIDENT_SUPERVISE have access.
   */
  static async hasEmergencyAccess(userId: string, userEmail?: string | null): Promise<boolean> {
    if (userEmail !== undefined && userEmail !== null) {
      if (userEmail === 'info.sunshineeldercare@gmail.com') return true;
    } else {
      if (await this.isOwner(userId)) return true;
    }

    const permissions = await this.getUserPermissions(userId);
    return (
      permissions.has('EMERGENCY_INCIDENT_VIEW') ||
      permissions.has('EMERGENCY_INCIDENT_OPERATE') ||
      permissions.has('EMERGENCY_INCIDENT_SUPERVISE')
    );
  }

  /**
   * Checks if user has supervisor rights in EmergencyOS
   * (e.g. approving Code Red downgrades, managing supervisory escalations).
   */
  static async isEmergencySupervisor(userId: string, userEmail?: string | null): Promise<boolean> {
    if (userEmail !== undefined && userEmail !== null) {
      if (userEmail === 'info.sunshineeldercare@gmail.com') return true;
    } else {
      if (await this.isOwner(userId)) return true;
    }

    const permissions = await this.getUserPermissions(userId);
    return permissions.has('EMERGENCY_INCIDENT_SUPERVISE');
  }
}
