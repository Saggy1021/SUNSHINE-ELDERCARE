"use server"

import { requireAuth } from "@/lib/auth/utils"
import { AdminUserService } from "@/lib/services/admin-users"
import { revalidatePath } from "next/cache"
import { RateLimitService } from "@/lib/services/rate-limit"

import { emailService } from "@/lib/services/email"

export async function inviteAdminUserAction(formData: FormData) {
  const user = await requireAuth();
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const employeeId = formData.get("employeeId") as string || null;
  const roleIds = formData.getAll("roleIds") as string[];

  if (!email || !name || roleIds.length === 0) {
    throw new Error("Missing required fields");
  }

  const token = await AdminUserService.inviteAdminUser(user.id, email, name, employeeId, roleIds);
  
  // Send the invitation email
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin-invite/${token}`;
  await emailService.send({
    to: email,
    subject: "Admin Invitation - Sunshine Eldercare",
    text: `Hello ${name},\n\nYou have been invited to become an administrator at Sunshine Eldercare.\n\nPlease complete your registration by setting your password here: ${inviteLink}\n\nThis invitation will expire in 24 hours.`,
    html: `<p>Hello ${name},</p><p>You have been invited to become an administrator at Sunshine Eldercare.</p><p>Please <a href="${inviteLink}">click here to accept your invitation and set your password</a>.</p><p>This invitation will expire in 24 hours.</p>`
  });

  revalidatePath("/admin/admin-users");
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
