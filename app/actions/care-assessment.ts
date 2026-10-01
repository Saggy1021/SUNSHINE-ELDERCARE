'use server'

import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { emailService } from '@/lib/services/email'
import { RateLimitService } from '@/lib/services/rate-limit'

export async function submitCareAssessment(formData: FormData) {
  try {
    await RateLimitService.checkLimit('PUBLIC_FORMS')
  } catch (error: any) {
    if (error?.name === 'RateLimitError') {
      redirect('/care-assessment?error=rate_limit')
    }
    throw error
  }

  const customerName = formData.get('customerName') as string;
  const customerPhone = formData.get('customerPhone') as string;
  const customerEmail = formData.get('customerEmail') as string;
  const elderName = formData.get('elderName') as string;
  const city = formData.get('city') as string;
  const requirements = formData.get('requirements') as string;
  const urgency = formData.get('urgency') as string;

  if (!customerName || !customerPhone || !customerEmail || !requirements) {
    throw new Error('Required fields are missing.');
  }

  const assessment = await db.careAssessment.create({
    data: {
      customerName,
      customerPhone,
      customerEmail,
      elderName,
      city,
      requirements,
      urgency,
      status: 'NEW'
    }
  });

  // Trigger email notification to coordinators
  // await emailService.sendCareAssessmentNotification(assessment);

  redirect('/care-assessment?success=true');
}
