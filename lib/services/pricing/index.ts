import { db } from '@/lib/db'

export interface PricingPreviewRequest {
  planId: string;
  addOnIds?: string[];
  billingFrequency?: string; // e.g. "ANNUAL", "MONTHLY"
  requirements?: string;
  locationId?: string;
}

export interface PricingCalculationResult {
  basePrice: number;
  addOnsTotal: number;
  discount: number;
  subtotal: number;
  currency: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    type: 'PLAN' | 'ADD_ON';
    referenceId: string;
    taxClassification?: string;
  }[];
}

export class PricingService {
  /**
   * Authoritative server-side price calculation.
   * Never trust client-provided totals.
   */
  async calculateSubtotal(request: PricingPreviewRequest): Promise<PricingCalculationResult> {
    const { planId, addOnIds = [] } = request;

    // 1. Load authoritative plan
    const plan = await db.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    if (!plan.active) {
      throw new Error(`Plan is currently inactive: ${planId}`);
    }

    let basePrice = plan.price;
    // In future: adjust basePrice by billingFrequency (e.g., Annual discount) if implemented.

    const lineItems = [
      {
        description: plan.name,
        quantity: 1,
        unitPrice: basePrice,
        total: basePrice,
        type: 'PLAN' as 'PLAN' | 'ADD_ON',
        referenceId: plan.id,
        taxClassification: plan.taxClassification || undefined
      }
    ];

    let addOnsTotal = 0;

    // 2. Validate and load add-ons
    if (addOnIds.length > 0) {
      const addOns = await db.addOn.findMany({
        where: {
          id: { in: addOnIds },
          active: true
        }
      });

      if (addOns.length !== addOnIds.length) {
        throw new Error('One or more invalid or inactive add-ons selected.');
      }

      // Check compatibility
      const planAddOns = await db.planAddOn.findMany({
        where: {
          planId: plan.id,
          addOnId: { in: addOnIds }
        }
      });

      if (planAddOns.length !== addOnIds.length) {
        throw new Error('One or more add-ons are not compatible with the selected plan.');
      }

      for (const addOn of addOns) {
        addOnsTotal += addOn.price;
        lineItems.push({
          description: addOn.name,
          quantity: 1,
          unitPrice: addOn.price,
          total: addOn.price,
          type: 'ADD_ON' as const,
          referenceId: addOn.id,
          taxClassification: addOn.taxClassification || undefined
        });
      }
    }

    const discount = 0; // Future: Apply valid discount codes here
    const subtotal = basePrice + addOnsTotal - discount;

    return {
      basePrice,
      addOnsTotal,
      discount,
      subtotal,
      currency: plan.currency,
      lineItems
    };
  }
}

export const pricingService = new PricingService();
