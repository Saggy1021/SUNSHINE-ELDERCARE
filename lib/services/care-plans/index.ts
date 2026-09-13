import { db } from '@/lib/db'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarePlanDurationResult {
  months: number
  documentedTotal: number
  hasDiscount: boolean
  discountNote: string | null
}

export interface CarePlanVariantResult {
  id: string
  variantType: 'SINGLE' | 'COUPLE'
  monthlyBasePrice: number
  monthlyGst: number
  monthlyTotal: number
  durations: CarePlanDurationResult[]
  services: { serviceName: string; serviceNote: string | null; sortOrder: number }[]
}

export interface CarePlanCatalogEntry {
  id: string
  slug: string
  name: string
  sortOrder: number
  variants: CarePlanVariantResult[]
}

export interface CarePlanLookupResult {
  planSlug: string
  planName: string
  variantType: 'SINGLE' | 'COUPLE'
  months: number
  monthlyBasePrice: number
  monthlyGst: number
  monthlyTotal: number
  documentedTotal: number
  hasDiscount: boolean
  discountNote: string | null
  services: { serviceName: string; serviceNote: string | null }[]
}

// ---------------------------------------------------------------------------
// Validation schema for public requests
// ---------------------------------------------------------------------------

export const carePlanLookupSchema = z.object({
  planSlug: z.string().min(1).max(100),
  variantType: z.enum(['SINGLE', 'COUPLE']),
  months: z.number().int().positive(),
})

export type CarePlanLookupRequest = z.infer<typeof carePlanLookupSchema>

// ---------------------------------------------------------------------------
// CarePricingService
// ---------------------------------------------------------------------------

export class CarePricingService {
  /**
   * Returns the full active catalog of care plans with all variants and durations.
   * Safe for public consumption — no auth required.
   * All prices come from the database (seeded from source document).
   */
  async getCatalog(): Promise<CarePlanCatalogEntry[]> {
    const plans = await db.carePlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        variants: {
          orderBy: { variantType: 'asc' },
          include: {
            durations: { orderBy: { months: 'asc' } },
            services: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })

    return plans.map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      sortOrder: plan.sortOrder,
      variants: plan.variants.map((v) => ({
        id: v.id,
        variantType: v.variantType as 'SINGLE' | 'COUPLE',
        monthlyBasePrice: v.monthlyBasePrice,
        monthlyGst: v.monthlyGst,
        monthlyTotal: v.monthlyTotal,
        durations: v.durations.map((d) => ({
          months: d.months,
          documentedTotal: d.documentedTotal,
          hasDiscount: d.hasDiscount,
          discountNote: d.discountNote,
        })),
        services: v.services.map((s) => ({
          serviceName: s.serviceName,
          serviceNote: s.serviceNote,
          sortOrder: s.sortOrder,
        })),
      })),
    }))
  }

  /**
   * Looks up the exact documented price for a specific plan/variant/duration combination.
   * NEVER trusts client-submitted prices. Client submits identifiers only.
   * Server resolves the authoritative commercial record.
   *
   * @throws Error if plan/variant/duration is not found or inactive.
   */
  async lookupPrice(request: CarePlanLookupRequest): Promise<CarePlanLookupResult> {
    // Validate input shape (caller should also validate, but we always validate server-side)
    const parsed = carePlanLookupSchema.safeParse(request)
    if (!parsed.success) {
      throw new Error(`INVALID_REQUEST: ${parsed.error.message}`)
    }

    const { planSlug, variantType, months } = parsed.data

    const plan = await db.carePlan.findFirst({
      where: { slug: planSlug, active: true },
      include: {
        variants: {
          where: { variantType },
          include: {
            durations: { where: { months } },
            services: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })

    if (!plan) {
      throw new Error(`PLAN_NOT_FOUND: ${planSlug}`)
    }

    const variant = plan.variants[0]
    if (!variant) {
      throw new Error(`VARIANT_NOT_FOUND: ${planSlug}/${variantType}`)
    }

    const duration = variant.durations[0]
    if (!duration) {
      throw new Error(`DURATION_NOT_FOUND: ${planSlug}/${variantType}/${months}m`)
    }

    return {
      planSlug: plan.slug,
      planName: plan.name,
      variantType: variant.variantType as 'SINGLE' | 'COUPLE',
      months,
      monthlyBasePrice: variant.monthlyBasePrice,
      monthlyGst: variant.monthlyGst,
      monthlyTotal: variant.monthlyTotal,
      documentedTotal: duration.documentedTotal,
      hasDiscount: duration.hasDiscount,
      discountNote: duration.discountNote,
      services: variant.services.map((s) => ({
        serviceName: s.serviceName,
        serviceNote: s.serviceNote,
      })),
    }
  }
}

export const carePricingService = new CarePricingService()
