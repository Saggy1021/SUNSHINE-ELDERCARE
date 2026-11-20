import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Backfill Permanent Date of Enrolment (DOE) ===");

  const allProfiles = await prisma.memberProfile.findMany({
    include: {
      user: {
        include: {
          payments: { where: { status: "VERIFIED" }, orderBy: { verifiedAt: "asc" } },
          receipts: { orderBy: { createdAt: "asc" } },
          subscriptions: { where: { status: { in: ["ACTIVE", "SCHEDULED"] } }, orderBy: { createdAt: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total profiles to evaluate: ${allProfiles.length}\n`);

  const updates = [];

  for (const profile of allProfiles) {
    const user = profile.user;
    const memberId = profile.memberId;
    const name = `${profile.salutation || ""} ${profile.firstName} ${profile.lastName}`.trim();

    if (!memberId) {
      console.log(`[SKIP - NO MEMBER ID] ${name} (User ID: ${profile.userId})`);
      console.log(`  -> Left as NULL (clearly marked missing / administrative review)\n`);
      continue;
    }

    // Determine authoritative original enrolment timestamp
    let authoritativeDate = null;
    let sourceReason = "";

    if (memberId === "SECD1000TAAM" && profile.dateOfEnrollment) {
      // Tanish Alam dedicated internal account with existing established DOE
      authoritativeDate = profile.dateOfEnrollment;
      sourceReason = "Existing authorized dateOfEnrollment";
    } else {
      // Priority 1: Verified payment timestamp
      const firstPayment = user?.payments?.[0];
      // Priority 2: Money receipt timestamp
      const firstReceipt = user?.receipts?.[0];
      // Priority 3: Profile creation timestamp
      const profileCreated = profile.createdAt;

      if (firstPayment?.verifiedAt) {
        authoritativeDate = firstPayment.verifiedAt;
        sourceReason = `First verified payment (${firstPayment.id})`;
      } else if (firstReceipt?.paymentDate) {
        authoritativeDate = firstReceipt.paymentDate;
        sourceReason = `Receipt paymentDate (${firstReceipt.receiptNumber})`;
      } else if (firstReceipt?.createdAt) {
        authoritativeDate = firstReceipt.createdAt;
        sourceReason = `Receipt createdAt (${firstReceipt.receiptNumber})`;
      } else if (profileCreated) {
        authoritativeDate = profileCreated;
        sourceReason = `Profile createdAt registration`;
      }
    }

    if (!authoritativeDate) {
      console.warn(`[WARNING - UNRESOLVED] Could not establish reliable date for ${memberId} (${name}). Leaving NULL.`);
      continue;
    }

    const formattedIST = new Date(authoritativeDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const formattedDOE = new Date(authoritativeDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const currentSub = user?.subscriptions?.[0];
    const subStartFormatted = currentSub?.startDate
      ? new Date(currentSub.startDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "None";

    console.log(`[BACKFILL TARGET] Member ID: ${memberId} | ${name}`);
    console.log(`  Source: ${sourceReason}`);
    console.log(`  Authoritative Timestamp (UTC): ${new Date(authoritativeDate).toISOString()}`);
    console.log(`  Authoritative Timestamp (IST): ${formattedIST}`);
    console.log(`  DOE to display: ${formattedDOE}`);
    console.log(`  Subscription FROM: ${subStartFormatted} (Independent!)\n`);

    updates.push({
      profileId: profile.id,
      memberId,
      name,
      authoritativeDate: new Date(authoritativeDate),
      formattedDOE,
    });
  }

  console.log(`Executing backfill for ${updates.length} member profiles...`);

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      await tx.memberProfile.update({
        where: { id: item.profileId },
        data: {
          enrollmentDate: item.authoritativeDate,
          dateOfEnrollment: item.authoritativeDate,
        },
      });
    }
  });

  console.log("Backfill transaction successfully committed!\n");

  // Verification step
  console.log("=== Verification After Backfill ===");
  const verifiedProfiles = await prisma.memberProfile.findMany({
    where: { memberId: { not: null } },
    select: {
      memberId: true,
      firstName: true,
      lastName: true,
      enrollmentDate: true,
      dateOfEnrollment: true,
    },
    orderBy: { memberId: "asc" },
  });

  for (const vp of verifiedProfiles) {
    const formatted = new Date(vp.enrollmentDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    console.log(`- ${vp.memberId} (${vp.firstName} ${vp.lastName}): DOE = ${formatted} | enrollmentDate = ${vp.enrollmentDate?.toISOString()} | dateOfEnrollment = ${vp.dateOfEnrollment?.toISOString()}`);
  }

  const nullProfiles = await prisma.memberProfile.findMany({
    where: { memberId: null },
    select: { userId: true, firstName: true, lastName: true, enrollmentDate: true },
  });
  console.log(`\nUnassigned profiles (should remain null): ${nullProfiles.length}`);
  nullProfiles.forEach((np) => {
    console.log(`- UserID: ${np.userId} (${np.firstName} ${np.lastName}): enrollmentDate = ${np.enrollmentDate}`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
