'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { notificationService } from '@/lib/services/notification'

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export async function submitContactForm(formData: FormData) {
  try {
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || '',
      message: formData.get('message') as string,
    }

    const validatedData = contactSchema.parse(data)

    // Persist inquiry first — database is authoritative
    const inquiry = await db.inquiry.create({
      data: {
        fullName: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        message: validatedData.message,
        status: 'NEW',
      }
    })

    // Fire admin notification AFTER db operation succeeds — never blocks the inquiry
    notificationService.onInquiryReceived(inquiry).catch(() => {})

    return { success: true }
  } catch (error) {
    console.error('Contact form submission failed:', error)
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, error: 'Failed to submit form' }
  }
}
