'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

import { documentService } from '@/lib/services/document'
import { validateUpload } from '@/lib/services/document/validation'

import { ROLES } from '@/lib/auth/roles'
import { generateEmailVerificationToken, generatePasswordResetToken, hashToken } from '@/lib/auth/tokens'

import { RateLimitService } from '@/lib/services/rate-limit'
import { memberRegistrationSchema } from '@/lib/validations/member'
import { notificationService } from '@/lib/services/notification'
import { after } from 'next/server'

export async function registerUser(formData: FormData) {
  try {
    await RateLimitService.checkLimit('AUTHENTICATION')
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
      // Do not reveal account existence
      return { success: true, message: "If the details are valid, an account has been created. Please check your email." }
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    // Run in a transaction to ensure atomic creation
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: normalizedEmail,
          passwordHash,
          role: ROLES.MEMBER,
          status: 'PENDING_VERIFICATION',
        }
      })

      let idProofDocumentId: string | null = null;
      const idProofFile = formData.get("idProofFile") as File | null;
      if (!idProofFile || idProofFile.size === 0) {
        throw new Error("ID Proof file upload is required.");
      }
      
      if (idProofFile.size > 2 * 1024 * 1024) {
        throw new Error("ID Proof file exceeds the 2MB size limit.");
      }
      const buffer = Buffer.from(await idProofFile.arrayBuffer());
        
        // This will enforce MIME types, magic bytes, and global size limit
        validateUpload("ID_PROOF", idProofFile.type, buffer);

        const uploadedDoc = await documentService.uploadDocument(
          newUser.id,
          buffer,
          idProofFile.name,
          idProofFile.type,
          "ID_PROOF",
          newUser.id,
          tx
        );
        idProofDocumentId = uploadedDoc.id;

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
          medicalConditions: validatedData.medicalConditions || null,
          bloodGroup: validatedData.bloodGroup || null,
          idProofDocumentId,
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

    // Generate email verification token and trigger email safely
    const rawToken = await generateEmailVerificationToken(normalizedEmail)
    after(() => notificationService.onAccountVerification(normalizedEmail, user.name || 'Member', rawToken))

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

    return { success: true, message: "If the details are valid, an account has been created. Please check your email." }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create account' }
  }
}

export async function requestPasswordReset(formData: FormData) {
  try {
    await RateLimitService.checkLimit('AUTHENTICATION')
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
      const rawToken = await generatePasswordResetToken(normalizedEmail)
      await notificationService.onPasswordReset(normalizedEmail, user.name || 'Member', rawToken)
    }

    return { success: true, message: "If an account exists, a password reset link has been sent." }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    return { success: false, error: "Failed to process password reset request." }
  }
}

export async function verifyEmail(email: string, rawToken: string) {
  try {
    try {
      await RateLimitService.checkLimit('OTP_VERIFICATION', email)
    } catch (rateLimitError: any) {
      if (rateLimitError?.name === 'RateLimitError') {
        await db.verificationToken.deleteMany({
          where: { identifier: `verify_${email}` }
        })
        return { success: false, error: 'Too many failed attempts. OTP invalidated. Please request a new one.' }
      }
      throw rateLimitError;
    }

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
      data: { 
        emailVerified: new Date(),
        status: 'ACTIVE'
      }
    })

    await db.verificationToken.delete({
      where: { identifier_token: { identifier, token: hashedToken } }
    })

    return { success: true }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    return { success: false, error: "Verification failed" }
  }
}

export async function resetPassword(formData: FormData) {
  try {
    await RateLimitService.checkLimit('AUTHENTICATION')
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
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    return { success: false, error: "Password reset failed" }
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    const normalizedEmail = email.toLowerCase()
    await RateLimitService.checkLimit('OTP_RESEND', normalizedEmail)
    await RateLimitService.checkLimit('OTP_RESEND_COOLDOWN', normalizedEmail)

    const user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user || user.status !== 'PENDING_VERIFICATION') {
      // Do not reveal account existence or state
      return { success: true }
    }

    const rawToken = await generateEmailVerificationToken(normalizedEmail)
    await notificationService.onAccountVerification(normalizedEmail, user.name || 'Member', rawToken)

    return { success: true }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Please wait a moment before requesting another OTP.' }
    }
    return { success: false, error: 'Failed to resend OTP.' }
  }
}
