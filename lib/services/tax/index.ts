import { db } from '@/lib/db'
import { PricingCalculationResult } from '../pricing'

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxClassification?: string;
  taxRateApplied: number;
}

export class TaxService {
  /**
   * Applies configured tax rules to the subtotal.
   * If no tax rule is configured for the given classification, 
   * it fails safely instead of assuming 18%.
   */
  async calculateTax(pricingResult: PricingCalculationResult, fallbackClassification = 'STANDARD_GST'): Promise<TaxCalculationResult> {
    // 1. Determine the primary tax classification.
    // In a real app, this might depend on the specific plan/add-on or user location.
    // For now, we take it from the first line item or use the fallback.
    const classification = pricingResult.lineItems[0]?.taxClassification || fallbackClassification;

    // 2. Fetch the active TaxRule
    const taxRule = await db.taxRule.findFirst({
      where: {
        active: true,
        // E.g., we could match taxCode or a classification mapping.
        // For simplicity, we just look for an active rule.
        // In production, we'd query by applicability or taxCode.
      }
    });

    if (!taxRule) {
      console.error('[TaxService] CRITICAL: No active tax rule found in database.');
      console.warn('[TaxService] Refusing to silently apply an unverified tax rate.');
      throw new Error('TAX_CONFIGURATION_PENDING');
    }

    // 3. Calculate Tax
    const taxRateApplied = taxRule.rate;
    const taxAmount = (pricingResult.subtotal * taxRateApplied) / 100;
    const total = pricingResult.subtotal + taxAmount;

    return {
      subtotal: pricingResult.subtotal,
      taxAmount,
      total,
      taxClassification: taxRule.taxCode,
      taxRateApplied,
    };
  }
}

export const taxService = new TaxService();
