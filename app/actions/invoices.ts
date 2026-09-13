'use server'

import { auth } from '@/auth'
import { carePricingService, carePlanLookupSchema } from '@/lib/services/care-plans'
import { taxService } from '@/lib/services/tax'
import { invoiceService } from '@/lib/services/invoice'
import { z } from 'zod'

export async function createCarePlanInvoiceAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED')
  }

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
