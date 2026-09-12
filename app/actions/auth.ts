'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return { success: false, error: "Email already registered" }
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
      }
    })

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create account' }
  }
}
