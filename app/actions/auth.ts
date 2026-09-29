'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

import { ROLES } from '@/lib/auth/roles'
import { generateEmailVerificationToken, generatePasswordResetToken, hashToken } from '@/lib/auth/tokens'

import { memberRegistrationSchema } from '@/lib/validations/member'

export async function registerUser(formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    // Convert string 'on' to boolean for shiftAuthorization if present
    if (data.shiftAuthorization === 'on' || data.shiftAuthorization === 'true') {
      data.shiftAuthorization = true as any;
    } else {
      data.shiftAuthorization = false as any;
    }

    const validationResult = memberRegistrationSchema.safeParse(data)
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0].message }
    }
    const validatedData = validationResult.data
    const normalizedEmail = validatedData.email.toLowerCase()

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return { success: false, error: "Registration failed. This email may already be in use." }
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    // Run in a transaction to ensure atomic creation
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: normalizedEmail,
          passwordHash,
          role: ROLES.USER,
        }
      })

      const profile = await tx.memberProfile.create({
        data: {
          userId: newUser.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          idProofType: validatedData.idProofType || null,
          idProofNumber: validatedData.idProofNumber || null,
          dateOfBirth: new Date(validatedData.dateOfBirth),
          gender: validatedData.gender,
          serviceAddress: validatedData.serviceAddress,
          nearestLandmark: validatedData.nearestLandmark || null,
          mobileNumber: validatedData.mobileNumber,
          alternateNumber: validatedData.alternateNumber || null,
          email: normalizedEmail,
        }
      })

      await tx.emergencyContact.create({
        data: {
          userId: newUser.id,
          fullName: validatedData.emergencyContactName,
          relationship: validatedData.emergencyContactRelationship,
          phone: validatedData.emergencyContactMobile,
          alternatePhone: validatedData.emergencyContactOther || null,
          email: validatedData.emergencyContactEmail || null,
        }
      })

      await tx.sponsor.create({
        data: {
          memberProfileId: profile.id,
          fullName: validatedData.sponsorName,
          relationship: validatedData.sponsorRelationship,
          mobileNumber: validatedData.sponsorMobile,
          alternateNumber: validatedData.sponsorOther || null,
          email: validatedData.sponsorEmail || null,
        }
      })

      if (validatedData.insuranceProvider || validatedData.policyNumber) {
        await tx.insuranceDetails.create({
          data: {
            memberProfileId: profile.id,
            providerName: validatedData.insuranceProvider || '',
            policyNumber: validatedData.policyNumber || '',
            coverageAmount: validatedData.coverageAmount || null,
          }
        })
      }

      await tx.medicalAuthorization.create({
        data: {
          memberProfileId: profile.id,
          hospitalForSos: validatedData.hospitalForSos || null,
          nomineeLocalContact: validatedData.nomineeLocalContact || null,
          shiftAuthorization: validatedData.shiftAuthorization,
        }
      })

      return newUser
    })

    // Phase 2: Generate email verification token (email provider will be connected later)
    await generateEmailVerificationToken(normalizedEmail)

    // Audit log
    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'MEMBER_REGISTERED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { message: 'Member registration successful' }
      }
    })

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    return { success: false, error: 'Failed to create account' }
  }
}

export async function requestPasswordReset(formData: FormData) {
  try {
    const email = formData.get('email') as string
    
    if (!email) {
      return { success: false, error: "Email is required" }
    }

    const normalizedEmail = email.toLowerCase()

    const user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    // Secure behavior: Do not reveal if the account exists
    if (user) {
      // Phase 2: Generate token (Email provider integration in Phase 3)
      await generatePasswordResetToken(normalizedEmail)
    }

    return { success: true, message: "If an account exists, a password reset link has been sent." }
  } catch (error) {
    return { success: false, error: "Failed to process password reset request." }
  }
}

export async function verifyEmail(email: string, rawToken: string) {
  try {
    const hashedToken = hashToken(rawToken)
    const identifier = `verify_${email}`

    const existingToken = await db.verificationToken.findFirst({
      where: { identifier, token: hashedToken }
    })

    if (!existingToken) {
      return { success: false, error: "Invalid token" }
    }

    if (new Date(existingToken.expires) < new Date()) {
      return { success: false, error: "Token has expired" }
    }

    await db.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    })

    await db.verificationToken.delete({
      where: { identifier_token: { identifier, token: hashedToken } }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: "Verification failed" }
  }
}

export async function resetPassword(formData: FormData) {
  try {
    const email = (formData.get('email') as string)?.toLowerCase()
    const rawToken = formData.get('token') as string
    const newPassword = formData.get('password') as string

    if (!email || !rawToken || !newPassword || newPassword.length < 8) {
      return { success: false, error: "Invalid input" }
    }

    const hashedToken = hashToken(rawToken)
    const identifier = `reset_${email}`

    const existingToken = await db.verificationToken.findFirst({
      where: { identifier, token: hashedToken }
    })

    if (!existingToken) {
      return { success: false, error: "Invalid or expired token" }
    }

    if (new Date(existingToken.expires) < new Date()) {
      return { success: false, error: "Token has expired" }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await db.user.update({
      where: { email },
      data: { 
        passwordHash,
        sessionVersion: { increment: 1 } 
      }
    })

    await db.verificationToken.delete({
      where: { identifier_token: { identifier, token: hashedToken } }
    })

    return { success: true, message: "Password updated successfully" }
  } catch (error) {
    return { success: false, error: "Password reset failed" }
  }
}
