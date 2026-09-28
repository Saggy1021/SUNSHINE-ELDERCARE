import { db } from "../db";
import { AuthorizationService } from "./authorization";
import bcrypt from "bcryptjs";

export class RoleService {
  static async getRoles(actorUserId: string) {
    await AuthorizationService.requireOwner(actorUserId);
    return db.role.findMany({
      include: {
        _count: {
          select: { users: true }
        },
        permissions: {
          include: { permission: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getPermissions(actorUserId: string) {
    await AuthorizationService.requireOwner(actorUserId);
    return db.permission.findMany({
      orderBy: { code: 'asc' }
    });
  }

  static async createRole(actorUserId: string, name: string, description: string, permissionCodes: string[]) {
    await AuthorizationService.requireOwner(actorUserId);
    
    // Find permission IDs
    const perms = await db.permission.findMany({
      where: { code: { in: permissionCodes } }
    });

    const role = await db.role.create({
      data: {
        name,
        description,
        isSystem: false,
        permissions: {
          create: perms.map(p => ({
            permissionId: p.id
          }))
        }
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ROLE_CREATED',
        entityType: 'ROLE',
        entityId: role.id,
        metadata: { name, permissionCodes }
      }
    });

    return role;
  }

  static async updateRole(actorUserId: string, roleId: string, description: string, permissionCodes: string[]) {
    await AuthorizationService.requireOwner(actorUserId);

    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error("Role not found");
    if (role.isSystem) {
      // Allow description/permission changes? The prompt says "cannot accidentally grant OWNER hierarchy"
      // System roles like Owner shouldn't have permissions modified easily.
      if (role.name === 'Owner') {
        throw new Error("Cannot modify Owner role permissions");
      }
    }

    const perms = await db.permission.findMany({
      where: { code: { in: permissionCodes } }
    });

    // Delete existing
    await db.rolePermission.deleteMany({
      where: { roleId }
    });

    const updated = await db.role.update({
      where: { id: roleId },
      data: {
        description,
        permissions: {
          create: perms.map(p => ({
            permissionId: p.id
          }))
        }
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ROLE_PERMISSIONS_UPDATED',
        entityType: 'ROLE',
        entityId: role.id,
        metadata: { permissionCodes }
      }
    });

    return updated;
  }
}
