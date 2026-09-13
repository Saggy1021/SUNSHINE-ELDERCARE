'use server'

import { z } from 'zod'
import { carePricingService, carePlanLookupSchema } from '@/lib/services/care-plans'

/**
 * Public server action — no authentication required.
 * Guests can look up documented prices by submitting identifiers only.
 * The server ALWAYS resolves the authoritative price from the database.
 * Client-submitted price/GST/total are IGNORED.
 */
export async function getCarePlanPrice(formData: FormData) {
  try {
    const raw = {
      planSlug: formData.get('planSlug') as string,
      variantType: formData.get('variantType') as string,
      months: Number(formData.get('months')),
    }

    const parsed = carePlanLookupSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: 'Invalid selection. Please choose a valid plan, variant, and duration.' }
    }

    const result = await carePricingService.lookupPrice(parsed.data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('PLAN_NOT_FOUND') ||
          error.message.startsWith('VARIANT_NOT_FOUND') ||
          error.message.startsWith('DURATION_NOT_FOUND')) {
        return { success: false, error: 'The selected care plan configuration is not available.' }
      }
    }
    return { success: false, error: 'Unable to retrieve pricing information. Please try again.' }
  }
}

/**
 * Public server action — returns the full active care plan catalog.
 * Used by the membership page to display database-backed pricing.
 * No authentication required.
 */
export async function getCarePlanCatalog() {
  try {
    const catalog = await carePricingService.getCatalog()
    return { success: true, data: catalog }
  } catch (error) {
    return { success: false, error: 'Unable to load care plan catalog.' }
  }
}
