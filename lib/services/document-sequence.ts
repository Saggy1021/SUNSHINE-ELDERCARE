import { db } from "../db";
import { FinancialYearService } from "./financial-year";

export class DocumentSequenceService {
  /**
   * Concurrency-safe generation of an official Invoice Number.
   * Format: SEC/1001/2026-27
   */
  static async generateInvoiceNumber(issueDate: Date, tx?: any): Promise<string> {
    const prisma = tx || db;
    const fy = FinancialYearService.getFinancialYear(issueDate);

    // Concurrency safe increment using Prisma's upsert
    const sequence = await prisma.invoiceSequence.upsert({
      where: { financialYear: fy },
      update: { nextSerial: { increment: 1 } },
      create: { financialYear: fy, nextSerial: 1002 },
    });

    const serial = sequence.nextSerial - 1;
    return `SEC/${serial}/${fy}`;
  }

  /**
   * Concurrency-safe generation of an official Receipt Number.
   * Format: SEC/REC/1001/2026-27 (Provisional technical format)
   */
  static async generateReceiptNumber(paymentDate: Date, tx?: any): Promise<string> {
    const prisma = tx || db;
    const fy = FinancialYearService.getFinancialYear(paymentDate);

    const sequence = await prisma.receiptSequence.upsert({
      where: { financialYear: fy },
      update: { nextSerial: { increment: 1 } },
      create: { financialYear: fy, nextSerial: 1002 },
    });

    const serial = sequence.nextSerial - 1;
    return `SEC/REC/${serial}/${fy}`;
  }
}
