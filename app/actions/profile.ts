"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const updateProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  alternateNumber: z.string().optional(),
  serviceAddress: z.string().min(10, "Service address must be complete"),
  nearestLandmark: z.string().optional(),
})

export async function updateMemberProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const data = Object.fromEntries(formData.entries())
  const validationResult = updateProfileSchema.safeParse(data)
  
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.errors[0].message }
  }

  const { firstName, lastName, mobileNumber, alternateNumber, serviceAddress, nearestLandmark } = validationResult.data

  const profile = await db.memberProfile.findUnique({
    where: { userId: session.user.id }
  })

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  await db.memberProfile.update({
    where: { id: profile.id },
    data: {
      firstName,
      lastName,
      mobileNumber,
      alternateNumber: alternateNumber || null,
      serviceAddress,
      nearestLandmark: nearestLandmark || null,
    }
  })

  // Log the update
  await db.auditLog.create({
    data: {
      actorUserId: session.user.id,
      action: 'MEMBER_PROFILE_UPDATED',
      entityType: 'MEMBER_PROFILE',
      entityId: profile.id,
      metadata: { 
        fieldsUpdated: ['firstName', 'lastName', 'mobileNumber', 'alternateNumber', 'serviceAddress', 'nearestLandmark'] 
      }
    }
  })

  revalidatePath('/dashboard/profile')
  return { success: true }
}

export async function getMemberProfile() {
  const session = await auth()
  if (!session?.user?.id) return null

  return db.memberProfile.findUnique({
    where: { userId: session.user.id }
  })
}
