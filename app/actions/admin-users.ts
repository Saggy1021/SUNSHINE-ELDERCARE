"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth/utils"
import { AdminUserService } from "@/lib/services/admin-users"
import { AuthorizationService } from "@/lib/services/authorization"
import { revalidatePath } from "next/cache"
import { RateLimitService } from "@/lib/services/rate-limit"
import { emailService } from "@/lib/services/email"
import { adminCreationOtpEmail } from "@/lib/services/email/templates"
import { hashToken } from "@/lib/auth/tokens"
import crypto from "crypto"

export interface RequestAdminCreationOtpParams {
  actorUserId: string;
  actorEmail: string;
  email: string;
  name: string;
  roleIds: string[];
  employeeId?: string | null;
  now?: Date;
}

/**
 * Core logic for requesting a Primary Owner OTP for new admin creation.
 * Enforces:
 * - Only Primary Owner (info.sunshineeldercare@gmail.com) can request
 * - Target admin details validation
 * - 6-digit cryptographic OTP
 * - OTP sent exclusively to Primary Owner email
 * - Rate limiting & 5-minute expiry
 * - Audit logging (never plaintext OTP)
 */
export async function requestAdminCreationOtpCore(
  params: RequestAdminCreationOtpParams,
  database: any = db,
  emailSvc: any = emailService,
  authorizationService: any = AuthorizationService,
  rateLimitService: any = RateLimitService
) {
  const { actorUserId, actorEmail, email, name, roleIds, employeeId, now = new Date() } = params;

  // 1. Strict Primary Owner authorization
  const isOwner = await authorizationService.isOwner(actorUserId);
  if (!isOwner || actorEmail !== 'info.sunshineeldercare@gmail.com') {
    throw new Error("Unauthorized: Only the Primary Owner can create administrator accounts.");
  }

  // 2. Validate proposed admin details
  const targetEmail = (email || '').toLowerCase().trim();
  const trimmedName = (name || '').trim();
  const validRoleIds = Array.isArray(roleIds) ? roleIds.filter(Boolean) : [];

  if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
    return { success: false, error: "Please enter a valid email address for the proposed administrator." };
  }
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Please enter a valid full name for the proposed administrator." };
  }
  if (validRoleIds.length === 0) {
    return { success: false, error: "At least one role must be assigned to the new administrator." };
  }

  // 3. Ensure target user does not already exist
  const existingUser = await database.user.findUnique({
    where: { email: targetEmail },
    select: { id: true }
  });
  if (existingUser) {
    return { success: false, error: "A user with this email address already exists in the system." };
  }

  // 4. Rate limit check on Primary Owner
  try {
    if (rateLimitService?.checkLimit) {
      await rateLimitService.checkLimit('OTP_RESEND', actorEmail);
    }
  } catch (err: any) {
    return { success: false, error: "Too many verification requests. Please wait a moment before requesting another code." };
  }

  // 5. Generate 6-digit cryptographic OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashToken(rawOtp);
  const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  const otpIdentifier = `admin_create_otp:${actorUserId}:${targetEmail}`;
  const metaIdentifier = `admin_create_meta:${actorUserId}:${targetEmail}`;
  const attemptsIdentifier = `admin_create_att:${actorUserId}:${targetEmail}`;

  // Purge any stale tokens
  await database.verificationToken.deleteMany({
    where: {
      identifier: {
        in: [otpIdentifier, metaIdentifier, attemptsIdentifier]
      }
    }
  });

  // Store hashed OTP (plaintext NEVER stored)
  await database.verificationToken.create({
    data: {
      identifier: otpIdentifier,
      token: hashedOtp,
      expires
    }
  });

  // Store metadata
  await database.verificationToken.create({
    data: {
      identifier: metaIdentifier,
      token: JSON.stringify({
        name: trimmedName,
        email: targetEmail,
        roleIds: validRoleIds,
        employeeId: employeeId || null,
        createdAt: now.toISOString()
      }),
      expires
    }
  });

  // Fetch role names for email context
  let roleNames = 'Administrator';
  if (database.role) {
    const roles = await database.role.findMany({
      where: { id: { in: validRoleIds } },
      select: { name: true }
    });
    if (roles && roles.length > 0) {
      roleNames = roles.map((r: any) => r.name).join(', ');
    }
  }

  // 6. Send email EXCLUSIVELY to Primary Owner
  const template = adminCreationOtpEmail({
    primaryOwnerName: "Primary Owner",
    proposedAdminName: trimmedName,
    proposedAdminEmail: targetEmail,
    roleNames,
    otp: rawOtp
  });

  await emailSvc.send({
    to: 'info.sunshineeldercare@gmail.com',
    subject: template.subject,
    html: template.html,
    text: template.text
  });

  // 7. Audit log (Never log plaintext OTP)
  await database.auditLog.create({
    data: {
      actorUserId,
      action: "ADMIN_CREATION_OTP_REQUESTED",
      entityType: "User",
      entityId: targetEmail,
      metadata: {
        primaryOwnerEmail: actorEmail,
        proposedAdminEmail: targetEmail,
        proposedAdminName: trimmedName,
        roleIds: validRoleIds,
        roleNames,
        employeeId: employeeId || null,
        expiresAt: expires.toISOString()
      }
    }
  });

  return {
    success: true,
    message: "A 6-digit verification code has been dispatched exclusively to the Primary Owner email (info.sunshineeldercare@gmail.com). Code expires in 5 minutes."
  };
}

export interface ConfirmAndCreateAdminParams {
  actorUserId: string;
  actorEmail: string;
  email: string;
  otp: string;
  name: string;
  roleIds: string[];
  employeeId?: string | null;
  password?: string;
  now?: Date;
}

/**
 * Core logic for verifying OTP and creating the new administrator account.
 * Enforces:
 * - Primary Owner revalidation
 * - Max 5 attempts lockout
 * - 5-minute expiry
 * - Single-use token consumption
 * - Audit logging
 */
export async function confirmAndCreateAdminCore(
  params: ConfirmAndCreateAdminParams,
  database: any = db,
  emailSvc: any = emailService,
  authorizationService: any = AuthorizationService,
  adminUserService: any = AdminUserService
) {
  const { actorUserId, actorEmail, email, otp, name, roleIds, employeeId, password, now = new Date() } = params;

  // 1. Strict Primary Owner authorization
  const isOwner = await authorizationService.isOwner(actorUserId);
  if (!isOwner || actorEmail !== 'info.sunshineeldercare@gmail.com') {
    throw new Error("Unauthorized: Only the Primary Owner can create administrator accounts.");
  }

  const targetEmail = (email || '').toLowerCase().trim();
  const trimmedOtp = (otp || '').trim();

  // Validate 6-digit format
  if (!trimmedOtp || !/^\d{6}$/.test(trimmedOtp)) {
    return { success: false, error: "Please enter a valid 6-digit verification code." };
  }

  const otpIdentifier = `admin_create_otp:${actorUserId}:${targetEmail}`;
  const metaIdentifier = `admin_create_meta:${actorUserId}:${targetEmail}`;
  const attemptsIdentifier = `admin_create_att:${actorUserId}:${targetEmail}`;

  // 2. Lockout check (5 failed attempts max)
  const attemptRecord = await database.verificationToken.findFirst({
    where: { identifier: attemptsIdentifier }
  });
  let currentAttempts = attemptRecord ? parseInt(attemptRecord.token, 10) || 0 : 0;

  if (currentAttempts >= 5) {
    await database.verificationToken.deleteMany({
      where: { identifier: { in: [otpIdentifier, metaIdentifier, attemptsIdentifier] } }
    });
    await database.auditLog.create({
      data: {
        actorUserId,
        action: "ADMIN_CREATION_LOCKED_OUT",
        entityType: "User",
        entityId: targetEmail,
        metadata: {
          reason: "Maximum 5 verification attempts exceeded",
          targetEmail,
          primaryOwnerEmail: actorEmail
        }
      }
    });
    return {
      success: false,
      lockedOut: true,
      error: "Maximum verification attempts exceeded (5 attempts). For security, this creation request has been cancelled. Please request a new code."
    };
  }

  // 3. Fetch OTP token
  const existingOtp = await database.verificationToken.findFirst({
    where: { identifier: otpIdentifier }
  });

  if (!existingOtp) {
    return {
      success: false,
      error: "No active verification code found or code has already been used. Please request a new code."
    };
  }

  // 4. Expiration check
  if (new Date(existingOtp.expires) < now) {
    await database.verificationToken.deleteMany({
      where: { identifier: { in: [otpIdentifier, metaIdentifier, attemptsIdentifier] } }
    });
    await database.auditLog.create({
      data: {
        actorUserId,
        action: "ADMIN_CREATION_OTP_FAILED",
        entityType: "User",
        entityId: targetEmail,
        metadata: { reason: "Code expired", targetEmail }
      }
    });
    return { success: false, expired: true, error: "Verification code has expired. Please request a new code." };
  }

  // 5. Cryptographic hash comparison
  const hashedInput = hashToken(trimmedOtp);
  if (hashedInput !== existingOtp.token) {
    currentAttempts += 1;
    await database.verificationToken.deleteMany({ where: { identifier: attemptsIdentifier } });
    await database.verificationToken.create({
      data: {
        identifier: attemptsIdentifier,
        token: currentAttempts.toString(),
        expires: existingOtp.expires
      }
    });

    await database.auditLog.create({
      data: {
        actorUserId,
        action: "ADMIN_CREATION_OTP_FAILED",
        entityType: "User",
        entityId: targetEmail,
        metadata: {
          attempt: currentAttempts,
          remainingAttempts: Math.max(0, 5 - currentAttempts),
          targetEmail
        }
      }
    });

    if (currentAttempts >= 5) {
      await database.verificationToken.deleteMany({
        where: { identifier: { in: [otpIdentifier, metaIdentifier, attemptsIdentifier] } }
      });
      await database.auditLog.create({
        data: {
          actorUserId,
          action: "ADMIN_CREATION_LOCKED_OUT",
          entityType: "User",
          entityId: targetEmail,
          metadata: {
            reason: "Maximum 5 verification attempts exceeded",
            targetEmail
          }
        }
      });
      return {
        success: false,
        lockedOut: true,
        error: "Maximum verification attempts exceeded (5 attempts). For security, this creation request has been cancelled. Please request a new code."
      };
    }

    return {
      success: false,
      remainingAttempts: 5 - currentAttempts,
      error: `Invalid verification code. ${5 - currentAttempts} attempt(s) remaining.`
    };
  }

  // 6. SINGLE-USE CONSUMPTION: Invalidate immediately
  await database.verificationToken.deleteMany({
    where: { identifier: { in: [otpIdentifier, metaIdentifier, attemptsIdentifier] } }
  });

  // 7. Audit log OTP verification success
  await database.auditLog.create({
    data: {
      actorUserId,
      action: "ADMIN_CREATION_OTP_VERIFIED",
      entityType: "User",
      entityId: targetEmail,
      metadata: {
        primaryOwnerEmail: actorEmail,
        targetEmail
      }
    }
  });

  // 8. Re-check email uniqueness
  const existingUser = await database.user.findUnique({
    where: { email: targetEmail },
    select: { id: true }
  });
  if (existingUser) {
    return { success: false, error: "A user with this email address already exists in the system." };
  }

  // 9. Create Admin Account
  const validRoleIds = Array.isArray(roleIds) ? roleIds.filter(Boolean) : [];
  const empId = employeeId || null;

  if (password && password.length >= 8) {
    await adminUserService.createAdminUser(
      actorUserId,
      targetEmail,
      name,
      password,
      empId,
      validRoleIds
    );
  } else {
    const token = await adminUserService.inviteAdminUser(
      actorUserId,
      targetEmail,
      name,
      empId,
      validRoleIds
    );
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sunshineeldercare.in'}/admin-invite/${token}`;
    await emailSvc.send({
      to: targetEmail,
      subject: "Admin Invitation - Sunshine Eldercare",
      text: `Hello ${name},\n\nYou have been invited to become an administrator at Sunshine Eldercare.\n\nPlease complete your registration by setting your password here: ${inviteLink}\n\nThis invitation will expire in 24 hours.`,
      html: `<p>Hello ${name},</p><p>You have been invited to become an administrator at Sunshine Eldercare.</p><p>Please <a href="${inviteLink}">click here to accept your invitation and set your password</a>.</p><p>This invitation will expire in 24 hours.</p>`
    });
    // Ensure ADMIN_USER_CREATED is recorded
    await database.auditLog.create({
      data: {
        actorUserId,
        action: "ADMIN_USER_CREATED",
        entityType: "USER",
        entityId: targetEmail,
        metadata: {
          roleIds: validRoleIds,
          employeeId: empId,
          invitationSent: true,
          primaryOwnerEmail: actorEmail
        }
      }
    });
  }

  return {
    success: true,
    message: "Administrator account created successfully."
  };
}

/**
 * Server Action: Request Primary Owner OTP for New Admin Creation
 */
export async function requestAdminCreationOtpAction(data: {
  email: string;
  name: string;
  roleIds: string[];
  employeeId?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized.");
  const actorEmail = session.user.email || "";

  return requestAdminCreationOtpCore(
    {
      actorUserId: session.user.id,
      actorEmail,
      email: data.email,
      name: data.name,
      roleIds: data.roleIds,
      employeeId: data.employeeId,
    },
    db,
    emailService,
    AuthorizationService,
    RateLimitService
  );
}

/**
 * Server Action: Verify OTP and Complete New Admin Creation
 */
export async function confirmAndCreateAdminAction(data: {
  email: string;
  otp: string;
  name: string;
  roleIds: string[];
  employeeId?: string | null;
  password?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized.");
  const actorEmail = session.user.email || "";

  const result = await confirmAndCreateAdminCore(
    {
      actorUserId: session.user.id,
      actorEmail,
      email: data.email,
      otp: data.otp,
      name: data.name,
      roleIds: data.roleIds,
      employeeId: data.employeeId,
      password: data.password,
    },
    db,
    emailService,
    AuthorizationService,
    AdminUserService
  );

  if (result.success) {
    revalidatePath("/admin/employees");
    revalidatePath("/admin/admin-users");
  }

  return result;
}

/**
 * Legacy Admin Invitation Action:
 * Protected against direct invocation. Requires Primary Owner OTP verification.
 */
export async function inviteAdminUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.email !== 'info.sunshineeldercare@gmail.com') {
    throw new Error("Unauthorized: Only the Primary Owner can create administrator accounts.");
  }
  const otp = formData.get("otp") as string;
  if (!otp) {
    throw new Error("Verification code required. Direct invocation without Primary Owner OTP is not permitted.");
  }

  return confirmAndCreateAdminAction({
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    otp,
    employeeId: formData.get("employeeId") as string || null,
    roleIds: formData.getAll("roleIds") as string[],
    password: formData.get("password") as string || undefined,
  });
}

export async function revokeAdminInvitationAction(invitationId: string) {
  const user = await requireAuth();
  await AdminUserService.revokeAdminInvitation(user.id, invitationId);
  revalidatePath("/admin/admin-users");
}

export async function acceptAdminInvitationAction(token: string, formData: FormData) {
  const password = formData.get("password") as string;
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  await AdminUserService.acceptAdminInvitation(token, password);
}

export async function updateAdminUserAction(userId: string, formData: FormData) {
  const user = await requireAuth();
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  
  const employeeId = formData.get("employeeId") as string || null;
  const roleIds = formData.getAll("roleIds") as string[];

  if (roleIds.length === 0) {
    throw new Error("At least one role is required");
  }

  await AdminUserService.updateAdminUser(user.id, userId, roleIds, employeeId);
  revalidatePath("/admin/admin-users");
}

export async function toggleAdminStatusAction(userId: string, currentStatus: string) {
  const user = await requireAuth();
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await AdminUserService.setAdminStatus(user.id, userId, newStatus);
  revalidatePath("/admin/admin-users");
}

export async function resetAdminPasswordAction(userId: string, formData: FormData) {
  const user = await requireAuth();
  const newPassword = formData.get("newPassword") as string;
  if (!newPassword) throw new Error("Missing password");
  await AdminUserService.resetAdminPassword(user.id, userId, newPassword);
  revalidatePath("/admin/admin-users");
}
