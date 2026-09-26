"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AuthorizationService } from "@/lib/services/authorization"
import { CustomPlanService } from "@/lib/services/custom-plan"
import { customPlanSchema, CustomPlanInput } from "@/lib/validations/custom-plan"
import { revalidatePath } from "next/cache"

async function requirePermission(permission: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized access.")
  }
  await AuthorizationService.require(session.user.id, permission)
  return session.user.id
}

async function logAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: any) {
  await db.auditLog.create({
    data: {
      actorUserId: actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || {}
    }
  })
}

export async function createCustomPlan(data: CustomPlanInput) {
  const adminId = await requirePermission("CUSTOM_PLAN_CREATE")

  const parsed = customPlanSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid custom plan data")
  }
  
  const { userId, name, description, amount, currency, durationType, durationValue, startDate } = parsed.data;

  // Validate member exists
  const member = await db.user.findUnique({
    where: { id: userId },
    include: { memberProfile: true }
  });

  if (!member) {
    throw new Error("Member not found");
  }

  // Calculate End Date safely server-side
  const endDate = CustomPlanService.calculateEndDate(startDate, durationType, durationValue);

  const customPlan = await db.customPlanAgreement.create({
    data: {
      userId,
      createdByUserId: adminId,
      name,
      description,
      amount,
      currency,
      durationType,
      durationValue,
      startDate,
      calculatedEndDate: endDate,
      status: "APPROVED", // Or "DRAFT" based on exact workflow, keeping it simple as APPROVED for admin action
      authorizedByUserId: adminId // Implicitly authorized if they have CREATE/APPROVE
    }
  });

  await logAudit(adminId, "CUSTOM_PLAN_CREATED", "CustomPlanAgreement", customPlan.id, {
    memberId: userId,
    amount,
    durationValue,
    durationType
  });

  revalidatePath('/admin/members/' + userId);
  return customPlan;
}

export async function getMemberCustomPlans(userId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized access.")
  }

  // A member can see their own, or an admin with CUSTOM_PLAN_VIEW can see it
  const isSelf = session.user.id === userId;
  if (!isSelf) {
    await AuthorizationService.require(session.user.id, "CUSTOM_PLAN_VIEW");
  }

  return db.customPlanAgreement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}
