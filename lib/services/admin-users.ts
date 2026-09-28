import { db } from "../db";
import { AuthorizationService } from "./authorization";
import bcrypt from "bcryptjs";

export class AdminUserService {
  static async getAdminUsers(actorUserId: string) {
    await AuthorizationService.requireOwner(actorUserId);
    return db.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        employee: true,
        userRoles: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createAdminUser(
    actorUserId: string,
    email: string,
    name: string,
    passwordPlain: string,
    employeeId: string | null,
    roleIds: string[]
  ) {
    await AuthorizationService.requireOwner(actorUserId);
    
    // check if user already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("User with email already exists");
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const user = await db.user.create({
      data: {
        email,
        name,
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash,
        userRoles: {
          create: roleIds.map(id => ({ roleId: id }))
        },
        ...(employeeId && { employee: { connect: { id: employeeId } } })
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ADMIN_USER_CREATED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { roleIds, employeeId }
      }
    });

    return user;
  }

  static async updateAdminUser(
    actorUserId: string,
    userId: string,
    roleIds: string[],
    employeeId: string | null
  ) {
    await AuthorizationService.requireOwner(actorUserId);
    
    const user = await db.$transaction(async (tx) => {
      const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });
      
      if (ownerRole && !roleIds.includes(ownerRole.id)) {
        // We are NOT assigning the Owner role. Check if user is currently an owner
        const isOwner = await tx.userRole.findUnique({
          where: { userId_roleId: { userId, roleId: ownerRole.id } }
        });
        
        if (isOwner) {
          // Lock all active owners
          const activeOwners = await tx.$queryRaw<{id: string}[]>`
            SELECT "User".id 
            FROM "User" 
            JOIN "UserRole" ON "User".id = "UserRole"."userId" 
            WHERE "UserRole"."roleId" = ${ownerRole.id} AND "User"."status" = 'ACTIVE' 
            FOR UPDATE
          `;
          
          if (activeOwners.length <= 1 && activeOwners.some(o => o.id === userId)) {
            throw new Error("Cannot remove OWNER role from the last owner");
          }
        }
      }

      // update roles
      await tx.userRole.deleteMany({ where: { userId } });
      
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          userRoles: {
            create: roleIds.map(id => ({ roleId: id }))
          },
          employee: employeeId ? { connect: { id: employeeId } } : { disconnect: true }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'ADMIN_USER_UPDATED',
          entityType: 'USER',
          entityId: updatedUser.id,
          metadata: { roleIds, employeeId }
        }
      });

      return updatedUser;
    });

    return user;
  }

  static async setAdminStatus(actorUserId: string, userId: string, status: string) {
    await AuthorizationService.requireOwner(actorUserId);

    const user = await db.$transaction(async (tx) => {
      if (status === 'INACTIVE') {
        const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });
        if (ownerRole) {
          // Check if this user is an owner
          const isOwner = await tx.userRole.findUnique({
            where: { userId_roleId: { userId, roleId: ownerRole.id } }
          });
          
          if (isOwner) {
            // Lock all active owners to prevent concurrent deactivation
            const activeOwners = await tx.$queryRaw<{id: string}[]>`
              SELECT "User".id 
              FROM "User" 
              JOIN "UserRole" ON "User".id = "UserRole"."userId" 
              WHERE "UserRole"."roleId" = ${ownerRole.id} AND "User"."status" = 'ACTIVE' 
              FOR UPDATE
            `;
            
            if (activeOwners.length <= 1 && activeOwners.some(o => o.id === userId)) {
              throw new Error("Cannot deactivate the last active owner");
            }
          }
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status }
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: status === 'ACTIVE' ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED',
          entityType: 'USER',
          entityId: updatedUser.id,
          metadata: { status }
        }
      });

      return updatedUser;
    });

    return user;
  }

  static async resetAdminPassword(actorUserId: string, userId: string, newPasswordPlain: string) {
    await AuthorizationService.requireOwner(actorUserId);
    
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);

    // Invalidate sessions
    const user = await db.user.update({
      where: { id: userId },
      data: { 
        passwordHash,
        sessionVersion: { increment: 1 } 
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ADMIN_ACCESS_RESET',
        entityType: 'USER',
        entityId: user.id,
        metadata: { }
      }
    });

    return user;
  }
}
