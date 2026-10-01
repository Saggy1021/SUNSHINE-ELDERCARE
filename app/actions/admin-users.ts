"use server"

import { requireAuth } from "@/lib/auth/utils"
import { AdminUserService } from "@/lib/services/admin-users"
import { revalidatePath } from "next/cache"
import { RateLimitService } from "@/lib/services/rate-limit"

export async function createAdminUserAction(formData: FormData) {
  const user = await requireAuth();
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const passwordPlain = formData.get("password") as string;
  const employeeId = formData.get("employeeId") as string || null;
  const roleIds = formData.getAll("roleIds") as string[];

  if (!email || !name || !passwordPlain || roleIds.length === 0) {
    throw new Error("Missing required fields");
  }

  await AdminUserService.createAdminUser(user.id, email, name, passwordPlain, employeeId, roleIds);
  revalidatePath("/admin/admin-users");
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
