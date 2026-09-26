import { db } from "../lib/db"
import { submitOfflinePayment, adminVerifyPayment } from "../lib/services/payment"
import { carePricingService } from "../lib/services/care-plans"
import { taxService } from "../lib/services/tax"
import { invoiceService } from "../lib/services/invoice"

async function runTests() {
  console.log("=== Phase 10 Payment Verification Tests ===")

  // 1. Create a dummy ADMIN and a dummy USER
  const admin = await db.user.create({
    data: { email: "payment_admin@example.com", role: "ADMIN", name: "Admin Test" }
  })
  const user = await db.user.create({
    data: { email: "payment_user@example.com", role: "USER", name: "User Test" }
  })
  const otherUser = await db.user.create({
    data: { email: "other_user@example.com", role: "USER", name: "Other User" }
  })
  
  // 2. Create CarePlan and RenewalRequest
  const carePlan = await db.carePlan.findFirst({ where: { slug: "life-line-care" } })
  if (!carePlan) throw new Error("Care plan missing")

  let rr = await db.renewalRequest.create({
    data: {
      userId: user.id,
      carePlanId: carePlan.id,
      variantType: "COUPLE",
      durationMonths: 6,
      requestedStartDate: new Date(Date.now() + 86400000), // Tomorrow (future -> SCHEDULED)
      calculatedEndDate: new Date(Date.now() + 86400000 * 180),
      status: "APPROVED",
      planName: "Life Line Care",
      documentedTotal: 23364,
    }
  })

  // 3. Create Invoice (Simulate checkout action)
  const pricingResult = await carePricingService.lookupPrice({
    planSlug: carePlan.slug,
    variantType: "COUPLE",
    months: 6,
  });
  const taxResult = await taxService.calculateCarePlanTax(pricingResult);
  const invoice = await invoiceService.createCarePlanInvoice(user.id, pricingResult, taxResult);

  // --- Tests ---
  
  // A. IDOR: Other user cannot submit payment for this invoice
  try {
    await submitOfflinePayment(otherUser.id, invoice.id, rr.id, invoice.total.toNumber(), "REF123")
    console.error("FAIL: IDOR bypassed (other user submitted payment)")
  } catch (e: any) {
    if (e.message.includes("Invalid invoice")) console.log("PASS: IDOR protected (cannot submit for another user's invoice)")
    else console.error("FAIL", e.message)
  }

  // B. Amount tampering: Submit payment with wrong amount
  try {
    await submitOfflinePayment(user.id, invoice.id, rr.id, 100, "REF123")
    console.error("FAIL: Amount tampering allowed")
  } catch (e: any) {
    if (e.message.includes("Amount mismatch")) console.log("PASS: Amount tampering rejected (trusted server amount required)")
    else console.error("FAIL", e.message)
  }

  // C. Successful Submission
  const payment = await submitOfflinePayment(user.id, invoice.id, rr.id, invoice.total.toNumber(), "REF123")
  if (payment.status === "VERIFICATION_PENDING") {
    console.log("PASS: Offline payment submitted, status VERIFICATION_PENDING")
  } else {
    console.error("FAIL: Payment status incorrect", payment.status)
  }

  // D. Idempotency Check
  try {
    await submitOfflinePayment(user.id, invoice.id, rr.id, invoice.total.toNumber(), "REF124")
    console.error("FAIL: Idempotency bypassed (duplicate submission allowed)")
  } catch (e: any) {
    if (e.message.includes("already pending")) console.log("PASS: Duplicate offline submission prevented (Idempotent)")
    else console.error("FAIL", e.message)
  }

  // E. Admin Verification (Transaction)
  await adminVerifyPayment(payment.id, admin.id)

  const updatedPayment = await db.payment.findUnique({ where: { id: payment.id } })
  if (updatedPayment?.status === "VERIFIED") {
    console.log("PASS: Payment status transitioned to VERIFIED")
  } else {
    console.error("FAIL: Payment status is", updatedPayment?.status)
  }

  const updatedInvoice = await db.invoice.findUnique({ where: { id: invoice.id } })
  if (updatedInvoice?.status === "PAID" && updatedInvoice.paymentStatus === "PAID") {
    console.log("PASS: Invoice settled correctly (status=PAID)")
  } else {
    console.error("FAIL: Invoice not marked paid")
  }

  const updatedRr = await db.renewalRequest.findUnique({ where: { id: rr.id } })
  if (updatedRr?.status === "COMPLETED") {
    console.log("PASS: RenewalRequest finalized (status=COMPLETED)")
  } else {
    console.error("FAIL: RenewalRequest not finalized")
  }

  // F. Subscription Activation check
  const newSub = await db.subscription.findFirst({ where: { userId: user.id } })
  if (newSub && newSub.status === "SCHEDULED") {
    console.log("PASS: Verified payment created correct Subscription state (SCHEDULED for future date)")
  } else {
    console.error("FAIL: Subscription state incorrect", newSub)
  }

  const auditLog = await db.auditLog.findFirst({ where: { action: "PAYMENT_VERIFIED", entityId: payment.id } })
  if (auditLog && auditLog.actorUserId === admin.id) {
    console.log("PASS: AuditLog securely created for verification")
  } else {
    console.error("FAIL: AuditLog missing")
  }

  // --- CLEANUP ---
  await db.auditLog.deleteMany({ where: { entityId: payment.id } })
  await db.payment.deleteMany({ where: { userId: user.id } })
  await db.subscription.deleteMany({ where: { userId: user.id } })
  await db.renewalRequest.deleteMany({ where: { userId: user.id } })
  await db.invoice.deleteMany({ where: { userId: user.id } })
  await db.user.deleteMany({ where: { id: { in: [user.id, admin.id, otherUser.id] } } })

  console.log("=== Cleanup Complete ===")
}

runTests().catch(console.error)
