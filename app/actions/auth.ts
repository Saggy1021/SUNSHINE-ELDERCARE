'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

import { documentService } from '@/lib/services/document'
import { validateUpload } from '@/lib/services/document/validation'

import { ROLES } from '@/lib/auth/roles'
import { generateEmailVerificationToken, generatePasswordResetToken, verifyPasswordResetToken, hashToken } from '@/lib/auth/tokens'

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

export async function requestPasswordReset(input: FormData | { email: string } | string) {
  try {
    let email = ''
    if (typeof input === 'string') {
      email = input
    } else if (input instanceof FormData) {
      email = (input.get('email') as string) || ''
    } else if (input && typeof input === 'object' && 'email' in input) {
      email = (input as any).email || ''
    }

    const normalizedEmail = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return { success: false, error: "Please enter a valid email address." }
    }

    // 1. IP-level rate limiting
    try {
      await RateLimitService.checkLimit('AUTHENTICATION')
    } catch (ipError: any) {
      if (ipError?.name === 'RateLimitError') {
        return { success: false, error: 'Too many requests from your IP. Please try again later.' }
      }
      throw ipError
    }

    // 2. Email-level rate limiting (max 5 requests per 15 min per email)
    try {
      await RateLimitService.checkLimit('OTP_RESEND', normalizedEmail)
    } catch (emailError: any) {
      if (emailError?.name === 'RateLimitError') {
        return { success: false, error: 'Too many reset requests for this email. Please try again later.' }
      }
      throw emailError
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    // Strict account enumeration mitigation:
    // If user does not exist or is not ACTIVE, execute simulated crypto delay
    // and return the identical success message.
    if (user && user.status === 'ACTIVE') {
      const rawToken = await generatePasswordResetToken(normalizedEmail)
      const sendResult = await notificationService.onPasswordReset(
        normalizedEmail,
        user.name || 'Member',
        rawToken
      )

      if (!sendResult.success && !sendResult.providerConfigured && process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Email delivery is currently unconfigured. Please contact support.' }
      }
    } else {
      // Constant-time execution simulation preventing timing side-channel attacks
      await bcrypt.hash('simulated_timing_delay_for_enumeration_protection', 10)
    }

    return { 
      success: true, 
      message: "If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder." 
    }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    return { success: false, error: "Failed to process password reset request. Please try again." }
  }
}

export async function verifyEmail(email: string, rawToken: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    // 1. IP-level rate limiting
    try {
      await RateLimitService.checkLimit('OTP_VERIFICATION')
    } catch (ipError: any) {
      if (ipError?.name === 'RateLimitError') {
        return { success: false, error: 'Too many verification attempts from your IP. Please try again later.' }
      }
      throw ipError;
    }

    // 2. Email-level rate limiting
    try {
      await RateLimitService.checkLimit('OTP_VERIFICATION', normalizedEmail)
    } catch (rateLimitError: any) {
      if (rateLimitError?.name === 'RateLimitError') {
        await db.verificationToken.deleteMany({
          where: { identifier: `verify_${normalizedEmail}` }
        })
        return { success: false, error: 'Too many failed attempts. OTP invalidated. Please request a new one.' }
      }
      throw rateLimitError;
    }

    const hashedToken = hashToken(rawToken.trim())
    const identifier = `verify_${normalizedEmail}`

    const existingToken = await db.verificationToken.findFirst({
      where: { identifier, token: hashedToken }
    })

    if (!existingToken) {
      return { success: false, error: "Invalid token" }
    }

    if (new Date(existingToken.expires) < new Date()) {
      await db.verificationToken.deleteMany({
        where: { identifier }
      })
      return { success: false, error: "Token has expired" }
    }

    await db.user.update({
      where: { email: normalizedEmail },
      data: { 
        emailVerified: new Date(),
        status: 'ACTIVE'
      }
    })

    await db.verificationToken.deleteMany({
      where: { identifier }
    })

    return { success: true }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    return { success: false, error: "Verification failed" }
  }
}

export async function resetPassword(
  input: FormData | { email: string; token: string; password: string; confirmPassword?: string }
) {
  try {
    let email = ''
    let rawToken = ''
    let newPassword = ''
    let confirmPassword = ''

    if (input instanceof FormData) {
      email = (input.get('email') as string) || ''
      rawToken = (input.get('token') as string) || ''
      newPassword = (input.get('password') as string) || ''
      confirmPassword = (input.get('confirmPassword') as string) || ''
    } else if (input && typeof input === 'object') {
      email = input.email || ''
      rawToken = input.token || ''
      newPassword = input.password || ''
      confirmPassword = input.confirmPassword || ''
    }

    const normalizedEmail = email.toLowerCase().trim()
    const trimmedToken = rawToken.trim()

    if (!normalizedEmail || !trimmedToken) {
      return { success: false, error: "Invalid or missing reset token." }
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." }
    }

    if (newPassword.length > 128) {
      return { success: false, error: "Password must not exceed 128 characters." }
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return { success: false, error: "Passwords do not match. Please ensure both passwords are identical." }
    }

    // Rate limiting to prevent brute-forcing reset tokens
    await RateLimitService.checkLimit('AUTHENTICATION')

    const hashedToken = hashToken(trimmedToken)
    const identifier = `reset_${normalizedEmail}`

    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Execute verification, user update, and token consumption atomically to eliminate TOCTOU race conditions
    const transactionResult = await db.$transaction(async (tx) => {
      const existingToken = await tx.verificationToken.findFirst({
        where: { identifier, token: hashedToken }
      })

      if (!existingToken) {
        return { success: false, error: "Invalid or expired reset link. Please request a new one." }
      }

      if (new Date(existingToken.expires) < new Date()) {
        await tx.verificationToken.deleteMany({
          where: { identifier }
        })
        return { success: false, error: "Password reset link has expired. Please request a new one." }
      }

      const user = await tx.user.findUnique({
        where: { email: normalizedEmail }
      })

      if (!user) {
        return { success: false, error: "Invalid or expired reset link. Please request a new one." }
      }

      // Atomic update: new password hash + increment sessionVersion to invalidate all active JWT sessions
      await tx.user.update({
        where: { email: normalizedEmail },
        data: { 
          passwordHash,
          sessionVersion: { increment: 1 } 
        }
      })

      // Consume single-use token immediately to prevent replay
      await tx.verificationToken.deleteMany({
        where: { identifier }
      })

      return { success: true }
    })

    if (!transactionResult.success) {
      return transactionResult
    }

    return { success: true, message: "Your password has been updated successfully." }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Too many requests. Please try again later.' }
    }
    return { success: false, error: "Password reset failed. Please try again." }
  }
}

export async function validatePasswordResetTokenAction(
  email: string,
  token: string
): Promise<{ valid: boolean; reason?: 'INVALID' | 'EXPIRED' }> {
  try {
    return await verifyPasswordResetToken(email, token)
  } catch {
    return { valid: false, reason: 'INVALID' }
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    await RateLimitService.checkLimit('OTP_RESEND')
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
    const sendResult = await notificationService.onAccountVerification(normalizedEmail, user.name || 'Member', rawToken)

    if (!sendResult.success) {
      if (!sendResult.providerConfigured && process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Email delivery is not configured on this server. Please contact support.' }
      }
      if (sendResult.providerConfigured) {
        return { success: false, error: 'Failed to deliver OTP. Please try again shortly.' }
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Please wait a moment before requesting another OTP.' }
    }
    return { success: false, error: 'Failed to resend OTP.' }
  }
}

export async function requestLoginOtp(email: string) {
  try {
    if (!email || typeof email !== 'string') {
      return { success: false, error: 'Email address is required.' }
    }

    const normalizedEmail = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    // 1. IP-level rate limiting (prevents automated distributed abuse)
    await RateLimitService.checkLimit('OTP_RESEND')
    // 2. Email-level rate limiting (max 5 requests per 15 min per email)
    await RateLimitService.checkLimit('OTP_RESEND', normalizedEmail)
    // 3. Email-level cooldown (60s interval)
    await RateLimitService.checkLimit('OTP_RESEND_COOLDOWN', normalizedEmail)

    const user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    // Strict explicit allowlist: Only ACTIVE users are permitted to receive a login OTP.
    // Non-active accounts (PENDING_VERIFICATION, SUSPENDED, BLOCKED, INACTIVE) receive an
    // anti-enumeration generic message, and no login OTP is dispatched.
    // Users with PENDING_VERIFICATION must complete account activation via /verify.
    if (!user || user.status !== 'ACTIVE') {
      return {
        success: true,
        message: 'If an active account exists with this email, a 6-digit login code has been sent.'
      }
    }

    const { generateLoginOtpToken } = await import('@/lib/auth/tokens')
    const rawToken = await generateLoginOtpToken(normalizedEmail)

    const sendResult = await notificationService.onLoginOtp(
      normalizedEmail,
      user.name || 'Member',
      rawToken
    )

    if (!sendResult.success) {
      if (!sendResult.providerConfigured && process.env.NODE_ENV === 'production') {
        return {
          success: false,
          error: 'Email delivery provider is not configured. Please sign in with your password or contact support.'
        }
      }
      if (sendResult.providerConfigured) {
        return {
          success: false,
          error: 'Unable to deliver login code. Please try again or sign in with your password.'
        }
      }
    }

    return {
      success: true,
      message: 'A 6-digit login code has been sent to your email.'
    }
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      return { success: false, error: 'Please wait a moment before requesting another login code.' }
    }
    return { success: false, error: 'Failed to request login code. Please try again.' }
  }
}
