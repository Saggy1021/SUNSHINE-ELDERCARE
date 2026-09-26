import { db } from "../lib/db"
import { DocumentSequenceService } from "../lib/services/document-sequence"
import { FinancialYearService } from "../lib/services/financial-year"

async function verify() {
  console.log("=== PHASE 15 VERIFICATION ===")
  const now = new Date()

  // 1. Financial Year Calculation
  const fy1 = FinancialYearService.getFinancialYear(new Date("2026-03-31"))
  const fy2 = FinancialYearService.getFinancialYear(new Date("2026-04-01"))
  console.log(`FY for Mar 31, 2026: ${fy1} (Expected: 2025-26)`)
  console.log(`FY for Apr 01, 2026: ${fy2} (Expected: 2026-27)`)
  if (fy1 !== "2025-26" || fy2 !== "2026-27") {
    throw new Error("Financial year calculation is incorrect")
  }

  // 2. Document Sequence Generation
  const inv1 = await DocumentSequenceService.generateInvoiceNumber(now)
  const inv2 = await DocumentSequenceService.generateInvoiceNumber(now)
  console.log(`Invoice 1: ${inv1}`)
  console.log(`Invoice 2: ${inv2}`)
  if (inv1 === inv2) throw new Error("Invoice sequences must be unique")

  const rec1 = await DocumentSequenceService.generateReceiptNumber(now)
  const rec2 = await DocumentSequenceService.generateReceiptNumber(now)
  console.log(`Receipt 1: ${rec1}`)
  console.log(`Receipt 2: ${rec2}`)
  if (rec1 === rec2) throw new Error("Receipt sequences must be unique")

  console.log("Verification Passed!")
  process.exit(0)
}

verify().catch(e => {
  console.error(e)
  process.exit(1)
})
