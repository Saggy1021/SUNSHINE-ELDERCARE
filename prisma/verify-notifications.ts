/**
 * Phase 11 — Email & Notification Infrastructure Verification
 * 
 * Validates:
 * - Notification service architecture
 * - Idempotency enforcement via EmailNotification model
 * - Email delivery does NOT alter business state
 * - Template generation correctness
 * - Security controls
 */

import { db } from "../lib/db"
import { notificationService } from "../lib/services/notification"
import { emailService } from "../lib/services/email"
import * as templates from "../lib/services/email/templates"
import { getEmailConfig, isEmailProviderConfigured } from "../lib/services/email/config"

let pass = 0
let fail = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    pass++
  } else {
    console.error(`  FAIL: ${message}`)
    fail++
  }
}

async function runTests() {
  console.log("=== Phase 11 — Email & Notification Verification ===\n")

  // ---------------------------------------------------------------------------
  // 1. Configuration
  // ---------------------------------------------------------------------------
  console.log("[ 1. Configuration ]")
  const config = getEmailConfig()
  assert(config.provider === "mock", "Email provider is 'mock' (development)")
  assert(!isEmailProviderConfigured(), "Provider correctly reports as NOT configured in mock mode")
  assert(config.companyName === "SUNSHINE ELDERCARE", "Company name is exactly 'SUNSHINE ELDERCARE'")
  assert(config.companyTagline === "COMPASSIONATE CARE FOR SENIORS", "Tagline is correct")
  assert(!config.fromAddress.includes("ceo@"), "Transactional sender is NOT ceo@ address")
  assert(config.appBaseUrl.length > 0, "App base URL is configured")

  // ---------------------------------------------------------------------------
  // 2. EmailService behavior when not configured
  // ---------------------------------------------------------------------------
  console.log("\n[ 2. Mock Provider Behavior ]")
  const result = await emailService.send({
    to: "test@example.com",
    subject: "Test",
    html: "<p>Test</p>",
  })
  assert(result.success === false, "Mock provider does NOT claim email was sent")
  assert(result.providerConfigured === false, "Mock provider reports providerConfigured=false")
  assert(emailService.isConfigured() === false, "EmailService.isConfigured() returns false in mock mode")

  // ---------------------------------------------------------------------------
  // 3. Template generation
  // ---------------------------------------------------------------------------
  console.log("\n[ 3. Template Generation ]")
  
  const renewalSubmitted = templates.renewalSubmittedEmail({
    memberName: "Test User",
    planName: "Life Line Care",
    variantType: "COUPLE",
    durationMonths: 6,
    requestedStartDate: "01 January 2027",
    calculatedEndDate: "01 July 2027",
    requestId: "ABC12345",
    dashboardUrl: "http://localhost:3000/dashboard",
  })
  assert(renewalSubmitted.subject === "Renewal Request Submitted", "Renewal submitted subject correct")
  assert(renewalSubmitted.html.includes("SUNSHINE ELDERCARE"), "Template includes company branding")
  assert(renewalSubmitted.html.includes("Life Line Care"), "Template includes plan name")
  assert(renewalSubmitted.html.includes("Awaiting Review"), "Template shows awaiting review status")
  assert(!renewalSubmitted.html.includes("active"), "Submitted template does NOT claim membership is active")

  const renewalApproved = templates.renewalApprovedEmail({
    memberName: "Test User",
    planName: "Shield Shine",
    variantType: "SINGLE",
    durationMonths: 12,
    startDate: "01 January 2027",
    endDate: "01 January 2028",
    dashboardUrl: "http://localhost:3000/dashboard",
  })
  assert(renewalApproved.subject === "Renewal Request Approved", "Approval subject correct")
  assert(renewalApproved.html.includes("payment"), "Approval email mentions payment as next step")
  assert(!renewalApproved.html.includes("membership is now active"), "Approval email does NOT claim membership is active")

  const paymentVerified = templates.paymentVerifiedEmail({
    memberName: "Test User",
    amount: "19,470",
    invoiceNumber: "INV-123",
    paymentMethod: "OFFLINE",
    membershipStatus: "SCHEDULED",
    planName: "Life Line Care",
    startDate: "01 March 2027",
    endDate: "01 September 2027",
    dashboardUrl: "http://localhost:3000/dashboard",
  })
  assert(paymentVerified.html.includes("Scheduled"), "Verified+SCHEDULED template says 'Scheduled'")
  assert(!paymentVerified.html.includes("is now active"), "SCHEDULED template does NOT say 'is now active'")

  const membershipActivated = templates.membershipActivatedEmail({
    memberName: "Test User",
    planName: "Shield Shine",
    variantType: "COUPLE",
    durationMonths: 6,
    startDate: "01 January 2027",
    endDate: "01 July 2027",
    addOns: ["Care Visit Plus"],
    dashboardUrl: "http://localhost:3000/dashboard",
  })
  assert(membershipActivated.subject === "Membership Activated", "Activation subject correct")
  assert(membershipActivated.html.includes("active"), "Activation template says active")
  assert(membershipActivated.html.includes("Care Visit Plus"), "Activation template includes add-ons")

  const membershipScheduled = templates.membershipScheduledEmail({
    memberName: "Test User",
    planName: "Life Line Care",
    variantType: "SINGLE",
    durationMonths: 3,
    startDate: "01 March 2027",
    endDate: "01 June 2027",
    dashboardUrl: "http://localhost:3000/dashboard",
  })
  assert(membershipScheduled.subject === "Membership Scheduled", "Scheduled subject correct")
  assert(membershipScheduled.html.includes("not yet active"), "Scheduled template says 'not yet active'")

  // ---------------------------------------------------------------------------
  // 4. Security Controls
  // ---------------------------------------------------------------------------
  console.log("\n[ 4. Security Controls ]")
  
  // All generated URLs must use trusted appBaseUrl
  assert(renewalSubmitted.html.includes("http://localhost:3000/dashboard"), "Email links use trusted application origin")
  assert(!renewalSubmitted.html.includes("evil.example.com"), "No external redirect URLs")
  
  // Admin email never included in member-facing templates
  assert(!renewalSubmitted.html.includes(config.adminNotificationAddress), "Admin address not exposed in member emails")
  assert(!paymentVerified.html.includes(config.adminNotificationAddress), "Admin address not exposed in payment emails")

  // ---------------------------------------------------------------------------
  // 5. Idempotency (via EmailNotification model)
  // ---------------------------------------------------------------------------
  console.log("\n[ 5. Idempotency ]")

  // Create test user
  const testUser = await db.user.create({
    data: { email: "idempotency_test@example.com", role: "USER", name: "Idempotency Test" }
  })

  const carePlan = await db.carePlan.findFirst({ where: { slug: "life-line-care" } })
  if (!carePlan) throw new Error("CarePlan missing")

  const testRenewal = await db.renewalRequest.create({
    data: {
      userId: testUser.id,
      carePlanId: carePlan.id,
      variantType: "SINGLE",
      durationMonths: 3,
      requestedStartDate: new Date(),
      calculatedEndDate: new Date(Date.now() + 86400000 * 90),
      status: "SUBMITTED",
      planName: "Life Line Care",
      documentedTotal: 8142,
    }
  })

  // First notification — should create record
  await notificationService.onRenewalSubmitted(testRenewal)

  const firstNotification = await db.emailNotification.findFirst({
    where: { entityId: testRenewal.id, eventType: "RENEWAL_SUBMITTED" }
  })
  assert(firstNotification !== null, "First notification attempt creates EmailNotification record")

  // Second notification — should be deduplicated
  await notificationService.onRenewalSubmitted(testRenewal)

  const notificationCount = await db.emailNotification.count({
    where: { entityId: testRenewal.id, eventType: "RENEWAL_SUBMITTED", recipientEmail: testUser.email! }
  })
  assert(notificationCount === 1, "Duplicate notification is suppressed (idempotent)")

  // ---------------------------------------------------------------------------
  // 6. Email failure does NOT affect business state
  // ---------------------------------------------------------------------------
  console.log("\n[ 6. Transaction Independence ]")

  // The renewal request should still be in its original state
  const renewalAfterNotification = await db.renewalRequest.findUnique({ where: { id: testRenewal.id } })
  assert(renewalAfterNotification?.status === "SUBMITTED", "Email operations do NOT alter renewal request state")

  // ---------------------------------------------------------------------------
  // 7. EmailNotification model exists and works
  // ---------------------------------------------------------------------------
  console.log("\n[ 7. EmailNotification Model ]")
  assert(firstNotification?.eventType === "RENEWAL_SUBMITTED", "EmailNotification eventType recorded correctly")
  assert(firstNotification?.entityType === "RenewalRequest", "EmailNotification entityType recorded correctly")
  assert(firstNotification?.recipientEmail === testUser.email, "EmailNotification recipient recorded correctly")
  assert(firstNotification?.status === "FAILED" || firstNotification?.status === "SENT", "EmailNotification status reflects delivery outcome")

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  await db.emailNotification.deleteMany({ where: { entityId: testRenewal.id } })
  await db.renewalRequest.delete({ where: { id: testRenewal.id } })
  await db.user.delete({ where: { id: testUser.id } })

  console.log("\n============================================================")
  console.log(`Results: ${pass} passed, ${fail} failed`)
  console.log("============================================================")
}

runTests().catch(console.error)
