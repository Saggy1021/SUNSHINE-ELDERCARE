'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

import { ROLES } from '@/lib/auth/roles'
import { generateEmailVerificationToken, generatePasswordResetToken, hashToken } from '@/lib/auth/tokens'

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function registerUser(formData: FormData) {
  try {
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const validatedData = signupSchema.parse(data)
    const normalizedEmail = validatedData.email.toLowerCase()

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return { success: false, error: "Registration failed. This email may already be in use." }
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    await db.user.create({
      data: {
        name: validatedData.name,
        email: normalizedEmail,
        passwordHash,
        role: ROLES.USER,
      }
    })

    // Phase 2: Generate email verification token (email provider will be connected later)
    await generateEmailVerificationToken(normalizedEmail)

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
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
