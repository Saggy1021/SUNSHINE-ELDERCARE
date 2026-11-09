'use server'

import { auth } from '@/auth'
import { carePricingService, carePlanLookupSchema } from '@/lib/services/care-plans'
import { taxService } from '@/lib/services/tax'
import { invoiceService } from '@/lib/services/invoice'
import { z } from 'zod'
import { RateLimitService } from '@/lib/services/rate-limit'

export async function isInternalDemoAuthorized(
  user: { id?: string; email?: string | null; role?: string } | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): Promise<boolean> {
  // Handle missing database user safely without throwing TypeError
  if (!user) {
    return false
  }

  // Preserve ADMIN authorization
  if (user.role === 'ADMIN') {
    return true
  }

  const allowlistedEmail = env.INTERNAL_DEMO_ACCOUNT_EMAIL?.trim().toLowerCase()
  const allowlistedUserId = env.INTERNAL_DEMO_ACCOUNT_USER_ID?.trim()

  // Exact allowlisted email (requires non-empty configured allowlist value)
  const matchesEmail =
    Boolean(allowlistedEmail) &&
    typeof user.email === 'string' &&
    Boolean(user.email.trim()) &&
    user.email.trim().toLowerCase() === allowlistedEmail

  // Exact allowlisted user ID (requires non-empty configured allowlist value)
  const matchesUserId =
    Boolean(allowlistedUserId) &&
    typeof user.id === 'string' &&
    Boolean(user.id.trim()) &&
    user.id.trim() === allowlistedUserId

  return Boolean(matchesEmail || matchesUserId)
}

export async function createCarePlanInvoiceAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED')
  }

  await RateLimitService.checkLimit('FINANCIAL')

  const rawData = {
    planSlug: formData.get('planSlug'),
    variantType: formData.get('variantType'),
    months: Number(formData.get('months'))
  }
  
  const idempotencyKey = formData.get('idempotencyKey') as string | null

  // 1. Validate identifiers ONLY
  const parsed = carePlanLookupSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(`INVALID_REQUEST: ${parsed.error.message}`)
  }

  // 1b. Restrict internal demo service to administrators or the dedicated internal demo account
  if (parsed.data.planSlug === 'internal-razorpay-demo') {
    const { db } = await import('@/lib/db')
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true },
    })

    const isAuthorized = await isInternalDemoAuthorized(user)
    if (!isAuthorized) {
      throw new Error('UNAUTHORIZED_TEST_SERVICE: The internal Razorpay demo service is restricted to administrators and the dedicated demo account.')
    }
  }

  // 2. Load authoritative pricing
  const pricingResult = await carePricingService.lookupPrice(parsed.data)

  // 3. Load authoritative tax (NO back-calculation for packages)
  const taxResult = await taxService.calculateCarePlanTax(pricingResult)

  // 4. Create immutable invoice snapshot
  const invoice = await invoiceService.createCarePlanInvoice(
    session.user.id,
    pricingResult,
    taxResult,
    idempotencyKey
  )

  return { success: true, invoiceId: invoice.id }
}
