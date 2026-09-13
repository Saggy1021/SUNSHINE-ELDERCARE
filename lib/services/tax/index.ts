import { db } from '@/lib/db'
import { PricingCalculationResult } from '../pricing'
import { CarePlanLookupResult } from '../care-plans'

export interface CarePlanTaxResult {
  subtotal: number | null;
  taxAmount: number | null;
  total: number;
  taxRateApplied: number | null;
}

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

  /**
   * Applies tax rules to CarePlan packages based strictly on documented values.
   * - 1-month packages have explicit Base + GST.
   * - 3/6/12-month packages have only a Total, so subtotal and taxAmount are null.
   */
  async calculateCarePlanTax(pricingResult: CarePlanLookupResult): Promise<CarePlanTaxResult> {
    if (pricingResult.months === 1) {
      return {
        subtotal: pricingResult.monthlyBasePrice,
        taxAmount: pricingResult.monthlyGst,
        total: pricingResult.monthlyTotal,
        taxRateApplied: 18.0, // Known from the catalog explicitly
      };
    }

    // For 3, 6, and 12-month packages, the source document provides the package total.
    // It does not explicitly separate GST, so we do NOT fabricate it.
    return {
      subtotal: null,
      taxAmount: null,
      total: pricingResult.documentedTotal,
      taxRateApplied: null,
    };
  }
}

export const taxService = new TaxService();
