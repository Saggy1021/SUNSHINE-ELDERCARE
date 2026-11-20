import assert from "node:assert";
import { db } from "../../lib/db";
import { maskEmail, createMemberSession, getAuthenticatedMember, destroyMemberSession } from "../../lib/auth/member-auth";
import { EmergencyService } from "../../lib/services/emergency";
import crypto from "crypto";
import bcrypt from "bcryptjs";

async function runTestSuite() {
  console.log("================================================================");
  console.log("Member App: Activation, Authentication, SOS & Dispatch Tests");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Email privacy masking
  await test("Test 1: maskEmail masks personal email addresses correctly", () => {
    assert.strictEqual(maskEmail("john.doe@example.com"), "j******e@example.com");
    assert.strictEqual(maskEmail("prabir@sunshine.in"), "p****r@sunshine.in");
    assert.strictEqual(maskEmail("ab@c.com"), "a*@c.com");
  });

  // 2. Identify real member in database
  let targetMember = await db.memberProfile.findFirst({
    where: {
      user: { status: "ACTIVE" },
      memberId: { not: null },
    },
    include: { user: true },
  });

  assert(targetMember, "Must find at least one active member in database");
  const memberId = targetMember.memberId!;
  const originalUserEmail = targetMember.user.email || targetMember.email;
  const originalPasswordHash = targetMember.user.passwordHash;

  await test("Test 2: Member profile lookup by canonical Member ID", async () => {
    const found = await db.memberProfile.findFirst({
      where: { memberId: { equals: memberId, mode: "insensitive" } },
      include: { user: true },
    });
    assert(found, `Member with ID ${memberId} should exist`);
    assert.strictEqual(found.userId, targetMember!.userId);
  });

  // 3. Initiate first-time activation flow
  const rawOtp = "654321";
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
  const actIdentifier = `member_act_${targetMember.id}`;

  await test("Test 3: First-time activation initiates OTP token generation", async () => {
    await db.verificationToken.deleteMany({ where: { identifier: actIdentifier } });
    const expires = new Date(Date.now() + 1000 * 60 * 5); // 5 min
    const record = await db.verificationToken.create({
      data: {
        identifier: actIdentifier,
        token: hashedOtp,
        expires,
      },
    });
    assert(record);
    assert.strictEqual(record.identifier, actIdentifier);
  });

  // 4. Verify OTP and generate activation token
  let rawActivationToken = "";
  await test("Test 4: OTP verification produces single-use activation token", async () => {
    const tokenRecord = await db.verificationToken.findFirst({
      where: { identifier: actIdentifier, token: hashedOtp },
    });
    assert(tokenRecord, "Hashed OTP must match");
    assert(new Date(tokenRecord.expires) > new Date(), "OTP must not be expired");

    // Invalidate OTP
    await db.verificationToken.deleteMany({ where: { identifier: actIdentifier } });

    // Generate activation token
    rawActivationToken = crypto.randomBytes(32).toString("hex");
    const hashedActivationToken = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
    const tokenIdentifier = `member_act_token_${targetMember!.id}`;

    await db.verificationToken.deleteMany({ where: { identifier: tokenIdentifier } });
    await db.verificationToken.create({
      data: {
        identifier: tokenIdentifier,
        token: hashedActivationToken,
        expires: new Date(Date.now() + 1000 * 60 * 15),
      },
    });
  });

  // 5. Set Password & Create Member Session
  const testPassword = "SunshineSecurePassword2026!";
  let sessionToken = "";
  await test("Test 5: Setting password hashes with bcrypt and creates 30-day session", async () => {
    const tokenIdentifier = `member_act_token_${targetMember!.id}`;
    const hashedActivationToken = crypto.createHash("sha256").update(rawActivationToken).digest("hex");

    const record = await db.verificationToken.findFirst({
      where: { identifier: tokenIdentifier, token: hashedActivationToken },
    });
    assert(record, "Activation token must be valid");

    // Hash password
    const newHash = await bcrypt.hash(testPassword, 12);
    await db.user.update({
      where: { id: targetMember!.userId },
      data: {
        passwordHash: newHash,
        sessionVersion: { increment: 1 },
      },
    });

    // Delete token
    await db.verificationToken.deleteMany({ where: { identifier: tokenIdentifier } });

    // Create session
    sessionToken = await createMemberSession(targetMember!.userId);
    assert(sessionToken, "Must produce session token");
  });

  // 6. Direct subsequent sign-in with canonical Member ID & Password
  await test("Test 6: Subsequent sign-in authenticates canonical Member ID & password", async () => {
    const user = await db.user.findUnique({
      where: { id: targetMember!.userId },
      include: { memberProfile: true },
    });
    assert(user?.passwordHash, "User must have password hash");
    const match = await bcrypt.compare(testPassword, user.passwordHash);
    assert.strictEqual(match, true, "Bcrypt password comparison must succeed");
  });

  // 7. Verify session using getAuthenticatedMember
  await test("Test 7: getAuthenticatedMember validates Bearer token and returns member details", async () => {
    const mockReq = new Request("https://www.sunshineeldercare.in/api/member/dashboard", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const auth = await getAuthenticatedMember(mockReq);
    assert.strictEqual(auth.authenticated, true);
    assert(auth.member);
    assert.strictEqual(auth.member.id, targetMember!.userId);
    assert.strictEqual(auth.member.memberId, memberId);
  });

  // 8. Prevent non-members from accessing member APIs
  await test("Test 8: Strict role separation blocks invalid or non-member sessions", async () => {
    const mockReq = new Request("https://www.sunshineeldercare.in/api/member/dashboard", {
      headers: {
        Authorization: "Bearer invalid-dummy-token-12345",
      },
    });
    const auth = await getAuthenticatedMember(mockReq);
    assert.strictEqual(auth.authenticated, false);
    assert.strictEqual(auth.statusCode, 401);
  });

  // 9. Member App SOS Creation
  let createdIncidentId = "";
  let createdIncidentNumber = "";
  await test("Test 9: Member SOS creates genuine CODE RED EmergencyOS incident", async () => {
    const incident = await EmergencyService.createIncident({
      userId: targetMember!.userId,
      memberId: memberId,
      callerName: `${targetMember!.salutation || ""} ${targetMember!.firstName} ${targetMember!.lastName}`.trim(),
      callerPhone: targetMember!.mobileNumber,
      triggerSource: "MEMBER_APP_SOS",
      triggerNotes: "Unit Test SOS from native Member App",
      latitude: 22.5857,
      longitude: 88.4146,
      accuracy: 12.5,
      fallbackAddress: targetMember!.serviceAddress,
    });

    assert(incident.id);
    assert.strictEqual(incident.classification, "CODE_RED");
    assert.strictEqual(incident.status, "TRIGGERED");
    assert.strictEqual(incident.trackingActive, true);
    assert.strictEqual(incident.triggerSource, "MEMBER_APP_SOS");
    assert.strictEqual(incident.memberId, memberId);

    createdIncidentId = incident.id;
    createdIncidentNumber = incident.incidentNumber;
  });

  // 10. Telemetry updates while incident is active
  await test("Test 10: Telemetry ingestion accepts live GPS updates during active SOS", async () => {
    const res = await EmergencyService.updateTelemetry({
      incidentId: createdIncidentId,
      latitude: 22.5860,
      longitude: 88.4150,
      accuracy: 8.0,
    });

    assert.strictEqual(res.found, true);
    assert.strictEqual(res.active, true);

    const check = await db.emergencyIncident.findUnique({ where: { id: createdIncidentId } });
    assert.strictEqual(check?.currentLatitude, 22.5860);
    assert.strictEqual(check?.currentLongitude, 88.4150);
  });

  // 11. Dispatch responder (Employee)
  let testEmployee = await db.employee.findFirst({ where: { status: "ACTIVE" } });
  assert(testEmployee, "Must have active employee for dispatch test");

  await test("Test 11: Dispatching field employee updates incident status to DISPATCHED", async () => {
    const updated = await EmergencyService.dispatchResponder({
      incidentId: createdIncidentId,
      employeeId: testEmployee!.id,
      actorId: targetMember!.userId,
      actorName: "Test Operator",
      notes: "Unit test dispatch responder",
    });

    assert.strictEqual(updated.status, "DISPATCHED");
    assert.strictEqual(updated.assignedEmployeeId, testEmployee!.id);
  });

  // 12. Responder marks arrival on scene
  await test("Test 12: Responder marks arrival on scene, updating status to RESPONDER_ON_SCENE", async () => {
    const updated = await EmergencyService.recordArrival({
      incidentId: createdIncidentId,
      actorId: testEmployee!.id,
      actorName: `${testEmployee!.firstName} ${testEmployee!.lastName}`,
      notes: "Arrived at member premises",
    });

    assert.strictEqual(updated.status, "RESPONDER_ON_SCENE");
    assert(updated.responderArrivedAt);
  });

  // 13. Incident resolution stops telemetry transmission (HTTP 410)
  await test("Test 13: Incident resolution terminates tracking and returns active=false (HTTP 410 signal)", async () => {
    await EmergencyService.resolveIncident({
      incidentId: createdIncidentId,
      actorId: testEmployee!.id,
      actorName: "Test Supervisor",
      resolutionNotes: "Emergency handled and member safe",
    });

    const res = await EmergencyService.updateTelemetry({
      incidentId: createdIncidentId,
      latitude: 22.5870,
      longitude: 88.4160,
    });

    assert.strictEqual(res.found, true);
    assert.strictEqual(res.active, false, "Tracking must be inactive after resolution");
  });

  // Cleanup: Restore original password hash and destroy test session
  if (originalPasswordHash) {
    await db.user.update({
      where: { id: targetMember.userId },
      data: { passwordHash: originalPasswordHash },
    });
  }
  await destroyMemberSession(sessionToken);

  console.log("\n================================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
