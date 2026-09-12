'use server'

import { z } from 'zod'
import { emailService } from '@/lib/services/email'
import { businessData } from '@/lib/config/business-data'

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export async function submitContactForm(formData: FormData) {
  try {
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    }

    const validatedData = contactSchema.parse(data)

    const emailServiceInstance = emailService
    
    // In a real app, this would send an email to the business and an auto-reply to the user.
    await emailServiceInstance.sendEmail({
      to: businessData.email,
      subject: `New Inquiry from ${validatedData.name}`,
      body: `Name: ${validatedData.name}\nEmail: ${validatedData.email}\n\nMessage:\n${validatedData.message}`
    })

    return { success: true }
  } catch (error) {
    console.error('Contact form submission failed:', error)
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    return { success: false, error: 'Failed to submit form' }
  }
}
