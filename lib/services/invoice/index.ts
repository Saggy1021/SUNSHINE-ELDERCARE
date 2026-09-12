import { db } from '@/lib/db'
import { PricingCalculationResult } from '../pricing'
import { TaxCalculationResult } from '../tax'

export class InvoiceService {
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
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
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
            // In a real app, each line item might have its own calculated tax.
            // For simplicity here, we distribute the total tax or mark it on the main plan.
            taxClassification: item.taxClassification || tax.taxClassification,
            taxRateApplied: tax.taxRateApplied,
            taxAmount: (item.total / pricing.subtotal) * tax.taxAmount // Pro-rated tax
          }))
        }
      },
      include: {
        lineItems: true
      }
    });

    return invoice;
  }
}

export const invoiceService = new InvoiceService();
