import { db } from "../db";

export class AuthorizationService {
  /**
   * Retrieves all permissions assigned to a user via their roles.
   * Caching could be introduced here if performance requires it,
   * but for now it performs a direct DB lookup to ensure safety.
   */
  static async getUserPermissions(userId: string): Promise<Set<string>> {
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
  }

  /**
   * Checks if a user has a specific permission.
   */
  static async can(userId: string, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.has(permissionCode);
  }

  /**
   * Requires a specific permission. Throws an error if not authorized.
   */
  static async require(userId: string, permissionCode: string): Promise<void> {
    const hasPerm = await this.can(userId, permissionCode);
    if (!hasPerm) {
      throw new Error(`Unauthorized: Missing permission ${permissionCode}`);
    }
  }

  /**
   * Checks if a user has ALL of the given permissions.
   */
  static async requireAll(userId: string, permissionCodes: string[]): Promise<void> {
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
  static async requireAny(userId: string, permissionCodes: string[]): Promise<void> {
    const permissions = await this.getUserPermissions(userId);
    const hasAny = permissionCodes.some(code => permissions.has(code));
    if (!hasAny) {
      throw new Error(`Unauthorized: Requires at least one of [${permissionCodes.join(', ')}]`);
    }
  }
}
