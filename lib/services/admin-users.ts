import { db } from "../db";
import { AuthorizationService } from "./authorization";
import bcrypt from "bcryptjs";

export class AdminUserService {
  static async getEmployeeUsers(actorUserId: string) {
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');
    return db.user.findMany({
      where: { 
        role: { in: ['ADMIN', 'STAFF', 'CAREGIVER', 'COORDINATOR', 'SUPER_ADMIN', 'EMPLOYEE'] }
      },
      include: {
        employee: true,
        userRoles: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getAdminInvitations(actorUserId: string) {
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');
    return db.adminInvitation.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async inviteAdminUser(
    actorUserId: string,
    email: string,
    name: string,
    employeeId: string | null,
    roleIds: string[]
  ) {
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');
    
    // Prevent non-owners from granting Owner role
    const ownerRole = await db.role.findUnique({ where: { name: 'Owner' } });
    if (ownerRole && roleIds.includes(ownerRole.id)) {
      await AuthorizationService.requireOwner(actorUserId);
    }
    
    // check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User with email already exists");
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invitation = await db.adminInvitation.upsert({
      where: { email },
      update: {
        name,
        tokenHash,
        roleIds: JSON.stringify(roleIds),
        employeeId,
        status: 'PENDING',
        expiresAt,
        invitedById: actorUserId,
      },
      create: {
        email,
        name,
        tokenHash,
        roleIds: JSON.stringify(roleIds),
        employeeId,
        status: 'PENDING',
        expiresAt,
        invitedById: actorUserId,
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ADMIN_INVITATION_SENT',
        entityType: 'USER',
        entityId: email,
        metadata: { roleIds, employeeId }
      }
    });

    return token;
  }

    static async createAdminUser(
    actorUserId: string,
    email: string,
    name: string,
    passwordPlain: string,
    employeeId: string | null,
    roleIds: string[]
  ) {
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');

    // Owner role protection
    const ownerRole = await db.role.findUnique({ where: { name: 'Owner' } });
    if (ownerRole && roleIds.includes(ownerRole.id)) {
      await AuthorizationService.requireOwner(actorUserId);
    }

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User with email already exists');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const newUser = await db.user.create({
      data: {
        email,
        name,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        passwordHash,
        userRoles: { create: roleIds.map(id => ({ roleId: id })) },
        ...(employeeId ? { employee: { connect: { id: employeeId } } } : {})
      },
      include: { userRoles: true }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ADMIN_USER_CREATED',
        entityType: 'USER',
        entityId: newUser.id,
        metadata: { roleIds, employeeId }
      }
    });

    return newUser;
  }

  static async acceptAdminInvitation(tokenPlain: string, newPasswordPlain: string) {
    const crypto = require('crypto');
    
    // Find invitation
    const invitations = await db.adminInvitation.findMany({
      where: { status: 'PENDING' }
    });

    let validInvitation = null;
    for (const inv of invitations) {
      if (inv.expiresAt < new Date()) continue;
      const isMatch = await bcrypt.compare(tokenPlain, inv.tokenHash);
      if (isMatch) {
        validInvitation = inv;
        break;
      }
    }

    if (!validInvitation) {
      throw new Error("Invalid or expired invitation token.");
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);
    const roleIds = JSON.parse(validInvitation.roleIds);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: validInvitation.email,
          name: validInvitation.name,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          passwordHash,
          userRoles: {
            create: roleIds.map((id: string) => ({ roleId: id }))
          },
          ...(validInvitation.employeeId && { employee: { connect: { id: validInvitation.employeeId } } })
        }
      });

      await tx.adminInvitation.update({
        where: { id: validInvitation.id },
        data: { status: 'ACCEPTED' }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: newUser.id,
          action: 'ADMIN_INVITATION_ACCEPTED',
          entityType: 'USER',
          entityId: newUser.id,
          metadata: { invitationId: validInvitation.id }
        }
      });

      return newUser;
    });

    return user;
  }

  static async revokeAdminInvitation(actorUserId: string, invitationId: string) {
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');
    await db.adminInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' }
    });
    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'ADMIN_INVITATION_REVOKED',
        entityType: 'INVITATION',
        entityId: invitationId,
        metadata: {}
      }
    });
  }

  static async updateAdminUser(
    actorUserId: string,
    userId: string,
    roleIds: string[],
    employeeId: string | null
  ) {
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');
    
    const user = await db.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      const isActorOwner = await AuthorizationService.isOwner(actorUserId);
      if (targetUser?.email === 'info.sunshineeldercare@gmail.com' && !isActorOwner) {
        throw new Error("Only Owners can modify the Owner account.");
      }

      const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });

      // Protect against granting or removing Owner role without being an Owner
      if (ownerRole) {
        if (roleIds.includes(ownerRole.id) && !isActorOwner) {
          throw new Error("Only Owners can grant the Owner role.");
        }

        const isTargetOwner = await tx.userRole.findUnique({
          where: { userId_roleId: { userId, roleId: ownerRole.id } }
        });
        
        if (isTargetOwner && !roleIds.includes(ownerRole.id)) {
          if (!isActorOwner) {
            throw new Error("Only Owners can remove the Owner role.");
          }
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
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');

    const user = await db.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      const isActorOwner = await AuthorizationService.isOwner(actorUserId);
      if (targetUser?.email === 'info.sunshineeldercare@gmail.com') {
        if (!isActorOwner) throw new Error("Only Owners can modify Owner status.");
        if (status === 'INACTIVE') throw new Error("Cannot deactivate the canonical Owner account.");
      }

      const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });
      if (ownerRole) {
        const isTargetOwner = await tx.userRole.findUnique({
          where: { userId_roleId: { userId, roleId: ownerRole.id } }
        });
        
        if (isTargetOwner) {
          const isActorOwner = await AuthorizationService.isOwner(actorUserId);
          if (!isActorOwner) {
            throw new Error("Only Owners can modify Owner status.");
          }

          if (status === 'INACTIVE') {
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
    await AuthorizationService.require(actorUserId, 'ADMIN_USER_MANAGE');
    
    const targetUser = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    const isActorOwner = await AuthorizationService.isOwner(actorUserId);
    if (targetUser?.email === 'info.sunshineeldercare@gmail.com' && !isActorOwner) {
      throw new Error("Only Owners can reset passwords for the canonical Owner.");
    }

    const ownerRole = await db.role.findUnique({ where: { name: 'Owner' } });
    if (ownerRole) {
      const isTargetOwner = await db.userRole.findUnique({
        where: { userId_roleId: { userId, roleId: ownerRole.id } }
      });
      if (isTargetOwner && !isActorOwner) {
        throw new Error("Only Owners can reset passwords for other Owners.");
      }
    }

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
