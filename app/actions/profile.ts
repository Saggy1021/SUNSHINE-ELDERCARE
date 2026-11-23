"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { normalize12HourTime } from "@/lib/services/preferred-schedule"
import { RecurringSchedulerService } from "@/lib/services/recurring-scheduler"

const updateProfileSchema = z.object({
  salutation: z.string().optional(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  alternateNumber: z.string().optional(),
  serviceAddress: z.string().min(10, "Service address must be complete"),
  nearestLandmark: z.string().optional(),
  preferredVisitDay: z.string().optional(),
  preferredVisitTime: z.string().optional(),
  preferredVisitFrequency: z.string().optional(),
  preferredVisitFortnightlyPattern: z.string().optional(),
})

import { RateLimitService } from "@/lib/services/rate-limit"

export async function updateMemberProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  try {
    await RateLimitService.checkLimit('ADMINISTRATIVE')
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
  }

  const data = Object.fromEntries(formData.entries())
  const validationResult = updateProfileSchema.safeParse(data)
  
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.issues[0].message }
  }

  const {
    firstName,
    lastName,
    mobileNumber,
    alternateNumber,
    serviceAddress,
    nearestLandmark,
    preferredVisitDay,
    preferredVisitTime,
    preferredVisitFrequency,
    preferredVisitFortnightlyPattern,
  } = validationResult.data

  const profile = await db.memberProfile.findUnique({
    where: { userId: session.user.id }
  })

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const salutation = (validationResult.data.salutation || "").trim() || (profile.salutation || "Mr")

  const profileUpdateData: any = {
    salutation,
    firstName,
    lastName,
    mobileNumber,
    alternateNumber: alternateNumber || null,
    serviceAddress,
    nearestLandmark: nearestLandmark || null,
  }

  if (preferredVisitDay !== undefined) {
    profileUpdateData.preferredVisitDay = preferredVisitDay?.trim() || null
  }
  if (preferredVisitTime !== undefined) {
    profileUpdateData.preferredVisitTime = normalize12HourTime(preferredVisitTime)
  }
  if (preferredVisitFrequency !== undefined) {
    profileUpdateData.preferredVisitFrequency = preferredVisitFrequency?.trim() || "WEEKLY"
  }
  if (preferredVisitFortnightlyPattern !== undefined) {
    profileUpdateData.preferredVisitFortnightlyPattern = preferredVisitFortnightlyPattern?.trim() || null
  }

  await db.memberProfile.update({
    where: { id: profile.id },
    data: profileUpdateData,
  })

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: `${salutation} ${firstName} ${lastName}`.trim(),
    }
  })

  // Synchronize recurring care visit schedule if preferences were provided
  if (
    preferredVisitDay !== undefined ||
    preferredVisitTime !== undefined ||
    preferredVisitFrequency !== undefined ||
    preferredVisitFortnightlyPattern !== undefined
  ) {
    await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profile.id,
      newPreferredDay: profileUpdateData.preferredVisitDay,
      newPreferredTime: profileUpdateData.preferredVisitTime,
      newFrequency: profileUpdateData.preferredVisitFrequency,
      newFortnightlyPattern: profileUpdateData.preferredVisitFortnightlyPattern,
      actorUserId: session.user.id,
    })
  }

  // Log the update
  await db.auditLog.create({
    data: {
      actorUserId: session.user.id,
      action: 'MEMBER_PROFILE_UPDATED',
      entityType: 'MEMBER_PROFILE',
      entityId: profile.id,
      metadata: { 
        fieldsUpdated: Object.keys(profileUpdateData) 
      }
    }
  })

  revalidatePath('/dashboard/profile')
  revalidatePath('/admin/schedule')
  return { success: true }
}

export async function getMemberProfile() {
  const session = await auth()
  if (!session?.user?.id) return null

  return db.memberProfile.findUnique({
    where: { userId: session.user.id }
  })
}
