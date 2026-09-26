import { db } from '@/lib/db'
import { PricingCalculationResult } from '../pricing'
import { TaxCalculationResult, CarePlanTaxResult } from '../tax'
import { CarePlanLookupResult } from '../care-plans'
import { Prisma } from '@prisma/client'

export class InvoiceService {
  private generateUniqueInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Creates an immutable invoice from calculated pricing and tax results.
   * This locks the price and tax so historical changes don't affect it.
   */
  async createInvoice(
    userId: string,
    pricing: PricingCalculationResult,
    tax: TaxCalculationResult,
    planId?: string
  ) {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const referenceNumber = this.generateUniqueInvoiceNumber();

        const invoice = await db.invoice.create({
          data: {
            referenceNumber,
            userId,
            planId,
            subtotal: tax.subtotal,
            taxAmount: tax.taxAmount,
            total: tax.total,
            currency: pricing.currency,
            status: 'DRAFT',
            paymentStatus: 'UNPAID',
            lineItems: {
              create: pricing.lineItems.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.total,
                taxClassification: item.taxClassification || tax.taxClassification,
                taxRateApplied: tax.taxRateApplied,
                taxAmount: (item.total / pricing.subtotal) * tax.taxAmount
              }))
            }
          },
          include: {
            lineItems: true
          }
        });

        return invoice;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt < maxRetries - 1) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Failed to generate a unique invoice number after maximum retries');
  }

  /**
   * Creates an immutable invoice from authoritative CarePlan pricing and tax data.
   * Completely ignores client submissions for prices.
   */
  async createCarePlanInvoice(
    userId: string,
    pricing: CarePlanLookupResult,
    tax: CarePlanTaxResult,
    idempotencyKey?: string | null
  ) {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const referenceNumber = this.generateUniqueInvoiceNumber();

        const invoice = await db.invoice.create({
          data: {
            referenceNumber,
            userId,
            planId: pricing.planSlug,
            idempotencyKey: idempotencyKey || null,
            subtotal: tax.subtotal !== null ? new Prisma.Decimal(tax.subtotal) : null,
            taxAmount: tax.taxAmount !== null ? new Prisma.Decimal(tax.taxAmount) : null,
            total: new Prisma.Decimal(tax.total),
            currency: 'INR',
            status: 'DRAFT',
            paymentStatus: 'UNPAID',
            lineItems: {
              create: [{
                description: `${pricing.planName} - ${pricing.variantType} (${pricing.months} Month${pricing.months > 1 ? 's' : ''})`,
                planName: pricing.planName,
                variantType: pricing.variantType,
                durationMonths: pricing.months,
                discountNote: pricing.discountNote,
                quantity: 1,
                unitPrice: new Prisma.Decimal(tax.subtotal ?? tax.total),
                discount: new Prisma.Decimal(0),
                taxClassification: 'CARE_PLAN_GST',
                taxRateApplied: tax.taxRateApplied !== null ? new Prisma.Decimal(tax.taxRateApplied) : new Prisma.Decimal(0),
                taxAmount: tax.taxAmount !== null ? new Prisma.Decimal(tax.taxAmount) : null,
                lineTotal: new Prisma.Decimal(tax.total)
              }]
            }
          },
          include: {
            lineItems: true
          }
        });

        return invoice;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          // If the collision was on the idempotencyKey, return the existing invoice safely (Concurrency Safe!)
          if (error.meta?.target && (error.meta.target as string[]).includes('idempotencyKey') && idempotencyKey) {
            const existing = await db.invoice.findUnique({
              where: { idempotencyKey },
              include: { lineItems: true }
            });
            if (existing) return existing;
          }
          
          // Collision on unique constraint (referenceNumber). Retry.
          if (attempt < maxRetries - 1) {
            continue;
          }
        }
        throw error;
      }
    }
    
    throw new Error('Failed to generate a unique invoice number after maximum retries');
  }
}

export const invoiceService = new InvoiceService();
