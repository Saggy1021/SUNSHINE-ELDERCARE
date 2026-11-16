'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AuthorizationService } from '@/lib/services/authorization'
import { RateLimitService } from '@/lib/services/rate-limit'
import { executeAdminOnboardMember } from '@/lib/services/admin-onboarding'

/**
 * Public Next.js Server Action for Admin Member Onboarding.
 *
 * Security Contract:
 * 1. Takes ONLY formData from the browser/client.
 * 2. Strictly obtains the authenticated session server-side from cookies/JWT via auth().
 * 3. Enforces rate limiting on administrative actions.
 * 4. Enforces MEMBER_MANAGE permission check on the authenticated session user.
 * 5. If custom pricing is requested, independently enforces FINANCIAL_OVERRIDE permission.
 * 6. Never accepts arbitrary auth context, client-supplied user IDs, database clients, or mocks.
 */
export async function adminOnboardMember(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  await RateLimitService.checkLimit('ADMINISTRATIVE')
  await AuthorizationService.require(session.user.id, 'MEMBER_MANAGE')

  const customPriceStr = formData.get('customPrice') as string
  if (customPriceStr) {
    const customPriceReason = formData.get('customPriceReason') as string
    if (!customPriceReason) {
      return { success: false, error: 'Reason required for custom pricing' }
    }
    await AuthorizationService.require(session.user.id, 'FINANCIAL_OVERRIDE')
  }

  const result = await executeAdminOnboardMember(formData, session.user.id)
  if (result.success) {
    revalidatePath('/admin')
    revalidatePath('/admin/members')
  }
  return result
}
