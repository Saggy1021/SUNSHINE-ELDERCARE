"use server"

import { requireAuth } from "@/lib/auth/utils"
import { RoleService } from "@/lib/services/roles"
import { revalidatePath } from "next/cache"
import { RateLimitService } from "@/lib/services/rate-limit"

export async function createRoleAction(formData: FormData) {
  const user = await requireAuth();
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const permissionCodes = formData.getAll("permissionCodes") as string[];

  if (!name || permissionCodes.length === 0) {
    throw new Error("Missing required fields");
  }

  await RoleService.createRole(user.id, name, description, permissionCodes);
  revalidatePath("/admin/roles");
}

export async function updateRoleAction(roleId: string, formData: FormData) {
  const user = await requireAuth();
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  
  const description = formData.get("description") as string;
  const permissionCodes = formData.getAll("permissionCodes") as string[];

  if (permissionCodes.length === 0) {
    throw new Error("At least one permission is required");
  }

  await RoleService.updateRole(user.id, roleId, description, permissionCodes);
  revalidatePath("/admin/roles");
}
