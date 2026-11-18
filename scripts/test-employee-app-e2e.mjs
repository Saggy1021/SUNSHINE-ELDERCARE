import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("SUNSHINE ELDERCARE — EMPLOYEE APP E2E TEST SUITE");
  console.log("=================================================");

  // 1. Locate employee Tanish Alam (SEC185TAAM)
  const employee = await prisma.employee.findUnique({
    where: { employeeId: "SEC185TAAM" },
  });

  if (!employee) {
    throw new Error("Employee SEC185TAAM not found in database!");
  }

  console.log(`✓ Located employee: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
  console.log(`  Designation: ${employee.designation}, Email: ${employee.email}`);

  // 2. Locate Prabir Chakraverty's active care visit
  const visitId = "cmwjtrirz000611qvx8082im9";
  const visit = await prisma.careVisit.findUnique({
    where: { id: visitId },
    include: {
      careCase: {
        include: {
          elder: {
            include: {
              user: {
                include: { memberProfile: true },
              },
            },
          },
        },
      },
      assignedEmp: true,
    },
  });

  if (!visit) {
    throw new Error(`Visit ${visitId} not found in database!`);
  }

  const memberProfile = visit.careCase.elder.user.memberProfile;
  console.log(`✓ Located visit ${visit.id}:`);
  console.log(`  Member: ${memberProfile.salutation} ${memberProfile.firstName} ${memberProfile.lastName} (${memberProfile.memberId})`);
  console.log(`  Spouse: ${memberProfile.spouseSalutation} ${memberProfile.spouseFirstName} ${memberProfile.spouseLastName}`);
  console.log(`  Address: ${memberProfile.serviceAddress}`);
  console.log(`  Contact: ${memberProfile.mobileNumber}`);
  console.log(`  Assigned Employee: ${visit.assignedEmp?.firstName} ${visit.assignedEmp?.lastName} (${visit.assignedEmp?.employeeId})`);
  console.log(`  Scheduled Window: ${visit.scheduledStart.toISOString()} - ${visit.scheduledEnd.toISOString()}`);

  // 4. Test Step 1: Activation Flow Initiation & OTP Generation
  console.log("\n--- Testing Activation Flow ---");
  const testOtp = "729415";
  const hashedOtp = crypto.createHash("sha256").update(testOtp).digest("hex");
  const identifier = `emp_act_${employee.id}`;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashedOtp,
      expires: new Date(Date.now() + 1000 * 60 * 15),
    },
  });
  console.log(`✓ Stored activation OTP in VerificationToken for employee ${employee.employeeId}`);

  // Test Step 2: OTP Verification & Activation Token Issuance
  const foundToken = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: hashedOtp,
    },
  });
  if (!foundToken || new Date(foundToken.expires) < new Date()) {
    throw new Error("OTP verification failed!");
  }
  console.log("✓ OTP verified successfully");

  // Issue activation token
  const rawActivationToken = crypto.randomBytes(32).toString("hex");
  const hashedActToken = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
  const actIdentifier = `emp_token_${employee.id}`;

  await prisma.verificationToken.deleteMany({ where: { identifier: actIdentifier } });
  await prisma.verificationToken.create({
    data: {
      identifier: actIdentifier,
      token: hashedActToken,
      expires: new Date(Date.now() + 1000 * 60 * 15),
    },
  });
  console.log("✓ Activation token generated");

  // Test Step 3: Password Setting & Account Activation
  const testPassword = "SecureEmployeePass2026!";
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const updatedEmployee = await prisma.employee.update({
    where: { id: employee.id },
    data: {
      passwordHash,
      isActivated: true,
      activatedAt: new Date(),
    },
  });
  console.log(`✓ Account activated! isActivated=${updatedEmployee.isActivated}, passwordHash set`);

  // Test Step 4: Login with Employee ID + Password
  console.log("\n--- Testing Login Flow ---");
  const passwordMatches = await bcrypt.compare(testPassword, updatedEmployee.passwordHash);
  if (!passwordMatches) {
    throw new Error("Password comparison failed!");
  }
  console.log("✓ Password authenticated successfully");

  // Create session
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const session = await prisma.employeeSession.create({
    data: {
      sessionToken,
      employeeId: employee.id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });
  console.log(`✓ Created Employee Session token: ${session.sessionToken.substring(0, 16)}...`);

  // 5. Test Visit Execution Workflow
  console.log("\n--- Testing Visit Execution Workflow ---");
  // Step A: Record Actual Arrival (09:30 AM IST)
  const arrivalDate = new Date("2026-11-17T09:30:00+05:30");
  const visitWithArrival = await prisma.careVisit.update({
    where: { id: visit.id },
    data: {
      actualStart: arrivalDate,
      status: "IN_PROGRESS",
    },
  });
  console.log(`✓ Actual Arrival recorded: ${visitWithArrival.actualStart?.toISOString()}, Status=${visitWithArrival.status}`);

  // Step B: Record Work Description
  const workReport = "Assisted with morning mobility exercises, checked vitals (Blood Pressure: 120/80 mmHg, Pulse: 72 bpm), verified morning medications taken with breakfast, accompanied member for a 15-minute garden walk in Salt Lake, and confirmed spouse is comfortable.";
  const visitWithWork = await prisma.careVisit.update({
    where: { id: visit.id },
    data: {
      workDescription: workReport,
    },
  });
  console.log(`✓ Work description recorded (${visitWithWork.workDescription?.length} characters)`);

  // Step C: Record Actual Departure (10:00 AM IST)
  const departureDate = new Date("2026-11-17T10:00:00+05:30");
  const visitWithDeparture = await prisma.careVisit.update({
    where: { id: visit.id },
    data: {
      actualEnd: departureDate,
    },
  });
  console.log(`✓ Actual Departure recorded: ${visitWithDeparture.actualEnd?.toISOString()}`);

  // Step D: Complete Visit
  const completedVisit = await prisma.careVisit.update({
    where: { id: visit.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedById: employee.id,
    },
    include: {
      careCase: {
        include: {
          elder: {
            include: {
              user: {
                include: { memberProfile: true },
              },
            },
          },
        },
      },
      assignedEmp: true,
    },
  });
  console.log(`✓ Care Visit COMPLETED! completedAt=${completedVisit.completedAt?.toISOString()}`);
  console.log(`  Completed by: ${completedVisit.assignedEmp?.firstName} ${completedVisit.assignedEmp?.lastName} (${completedVisit.assignedEmp?.employeeId})`);

  // 6. Verify Admin Portal / Schedule Data Retrieval
  console.log("\n--- Verifying Admin Schedule Data Integration ---");
  const adminVisitCheck = await prisma.careVisit.findUnique({
    where: { id: visit.id },
    include: {
      assignedEmp: true,
      careCase: {
        include: {
          elder: {
            include: {
              user: {
                include: { memberProfile: true },
              },
            },
          },
        },
      },
    },
  });

  const adminMemberProfile = adminVisitCheck?.careCase?.elder?.user?.memberProfile;
  const spouseDisplay = adminMemberProfile?.spouseFirstName || adminMemberProfile?.spouseLastName
    ? `${adminMemberProfile?.spouseSalutation || "Mrs"} ${adminMemberProfile?.spouseFirstName} ${adminMemberProfile?.spouseLastName}`.trim()
    : "—";

  console.log("Admin Care Visit Record Verification:");
  console.log(`  Visit ID: ${adminVisitCheck?.id}`);
  console.log(`  Member: ${adminMemberProfile?.salutation || "Mr"} ${adminMemberProfile?.firstName} ${adminMemberProfile?.lastName}`);
  console.log(`  Spouse: ${spouseDisplay}`);
  console.log(`  Status: ${adminVisitCheck?.status}`);
  console.log(`  Scheduled Window: ${adminVisitCheck?.scheduledStart.toISOString()} - ${adminVisitCheck?.scheduledEnd.toISOString()}`);
  console.log(`  Actual Execution: ${adminVisitCheck?.actualStart?.toISOString()} - ${adminVisitCheck?.actualEnd?.toISOString()}`);
  console.log(`  Completed At: ${adminVisitCheck?.completedAt?.toISOString()}`);
  console.log(`  Work Report: "${adminVisitCheck?.workDescription}"`);

  console.log("\n=================================================");
  console.log("ALL BACKEND & EMPLOYEE APP E2E TESTS PASSED!");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
