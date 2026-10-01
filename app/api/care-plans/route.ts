import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { carePricingService, carePlanLookupSchema } from '@/lib/services/care-plans'

/**
 * GET /api/care-plans
 * Returns the full active care plan catalog.
 * Public — no authentication required.
 */
export async function GET() {
  try {
    const { RateLimitService } = await import('@/lib/services/rate-limit')
    await RateLimitService.checkLimit('PUBLIC_PRICING')
  } catch (error: any) {
    if (error?.code === 'RATE_LIMIT_EXCEEDED') {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { 'Retry-After': error.retryAfterSeconds?.toString() || '60' } })
    }
  }

  try {
    const catalog = await carePricingService.getCatalog()
    return NextResponse.json({ success: true, data: catalog })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Unable to load care plan catalog.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/care-plans/lookup
 * Resolves the authoritative documented price for a given plan/variant/duration.
 * Public — no authentication required (guests can view pricing).
 * Client MUST submit only identifiers (planSlug, variantType, months).
 * Any submitted price/GST/total from the client is completely IGNORED.
 */
export async function POST(req: NextRequest) {
  try {
    const { RateLimitService } = await import('@/lib/services/rate-limit')
    await RateLimitService.checkLimit('PUBLIC_PRICING')
  } catch (error: any) {
    if (error?.code === 'RATE_LIMIT_EXCEEDED') {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { 'Retry-After': error.retryAfterSeconds?.toString() || '60' } })
    }
  }

  try {
    const body = await req.json()

    // Validate identifiers only — never trust price from client
    const parsed = carePlanLookupSchema.safeParse({
      planSlug: body.planSlug,
      variantType: body.variantType,
      months: body.months,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Please provide valid planSlug, variantType, and months.' },
        { status: 400 }
      )
    }

    const result = await carePricingService.lookupPrice(parsed.data)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.startsWith('PLAN_NOT_FOUND') ||
        error.message.startsWith('VARIANT_NOT_FOUND') ||
        error.message.startsWith('DURATION_NOT_FOUND')
      ) {
        return NextResponse.json(
          { success: false, error: 'The selected care plan configuration is not available.' },
          { status: 404 }
        )
      }
    }
    return NextResponse.json(
      { success: false, error: 'Unable to retrieve pricing information.' },
      { status: 500 }
    )
  }
}
