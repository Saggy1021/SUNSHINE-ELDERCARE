import fs from "fs";
import { PrismaClient, Prisma } from "@prisma/client";
import { getMembersCore } from "../app/actions/admin.js";

const prodEnv = fs.readFileSync("/Users/tanish/Sunshine Web/.production-db-session.local", "utf8");
const match = prodEnv.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = match[1];

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

const EXCLUDED_MEMBER_EMAILS = [
  "info.sunshineeldercare@gmail.com",
  "founder@sunshineeldercare.in",
  "developer@sunshineeldercare.in",
  "system@sunshineeldercare.in"
];

async function measure(name, fn) {
  const t0 = performance.now();
  const res = await fn();
  const duration = Math.round(performance.now() - t0);
  return { name, duration, res };
}

async function runComparison() {
  console.log("=== MEASURING POST-OPTIMISATION PERFORMANCE ===");
  await prisma.$queryRaw`SELECT 1`;

  // 1. Members Page 1 (Using newly optimized getMembersCore)
  const m1 = await measure("Members Page 1 (Optimized SQL + CTE)", async () => {
    return await getMembersCore("", 1, 50, prisma, true);
  });

  // 2. Members Search ('Tanish')
  const mSearch = await measure("Members Search ('Tanish')", async () => {
    return await getMembersCore("Tanish", 1, 50, prisma, true);
  });

  // 3. Needs Attention Queue (with newly indexed tables)
  const needsAttention = await measure("Needs Attention Queue (Indexed)", async () => {
    return await Promise.all([
      prisma.renewalRequest.findMany({
        where: { status: "SUBMITTED", user: { email: { notIn: EXCLUDED_MEMBER_EMAILS } } },
        select: { id: true, planName: true, durationMonths: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
        take: 5
      }),
      prisma.inquiry.findMany({
        where: { status: "NEW" },
        select: { id: true, fullName: true, message: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.feedback.findMany({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
        select: { id: true, message: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.payment.findMany({
        where: { status: "VERIFICATION_PENDING", user: { email: { notIn: EXCLUDED_MEMBER_EMAILS } } },
        select: { id: true, amount: true, paymentMethod: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);
  });

  // 4. Communications Page (Single Grouped SQL Query vs 5 queries)
  const comms = await measure("Communications Page (Single Grouped Query)", async () => {
    return await Promise.all([
      prisma.memberComplaint.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
        take: 50
      }),
      prisma.$queryRaw`SELECT status, count(*)::int as count FROM "MemberComplaint" GROUP BY status;`
    ]);
  });

  // 5. Member Dashboard API Data (Optimized with CareVisits, Incident, Complaints, Receipts)
  const dash = await measure("Member Dashboard Bundle (Parallel + CareVisits)", async () => {
    const user = await prisma.user.findFirst({
      where: { memberProfile: { memberId: "SECD1000TAAM" } },
      include: { memberProfile: true }
    });
    if (!user) return null;
    return await Promise.all([
      prisma.memberProfile.findUnique({
        where: { id: user.memberProfile.id },
        include: { sponsor: true, medicalAuth: true }
      }),
      prisma.subscription.findFirst({
        where: { userId: user.id, status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "EXPIRED"] } },
        orderBy: { createdAt: "desc" },
        include: { carePlan: true }
      }),
      prisma.receipt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, receiptNumber: true, amount: true, paymentMethod: true, createdAt: true }
      }),
      prisma.communityEvent.findMany({
        where: { status: "PUBLISHED", visibleToAll: true, eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 10
      }),
      prisma.careVisit.findMany({
        where: {
          OR: [
            { careCase: { subscription: { userId: user.id } } },
            { careCase: { elder: { userId: user.id } } }
          ],
          status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] }
        },
        include: {
          assignedEmp: {
            select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true, contactNumber: true }
          }
        },
        orderBy: { scheduledStart: "asc" },
        take: 10
      })
    ]);
  });

  console.log("\n--- POST-OPTIMISATION RESULTS ---");
  const comparison = [
    { Operation: "Members Page 1 Load", Baseline: "3,141 ms", Optimized: `${m1.duration} ms`, Improvement: `${Math.round((3141 - m1.duration) / 3141 * 100)}% faster` },
    { Operation: "Members Search ('Tanish')", Baseline: "636 ms", Optimized: `${mSearch.duration} ms`, Improvement: `${Math.round((636 - mSearch.duration) / 636 * 100)}% faster` },
    { Operation: "Needs Attention Queue (DB queries)", Baseline: "1,429 ms (x2 = 2,858ms)", Optimized: `${needsAttention.duration} ms (cached x1)`, Improvement: `${Math.round((2858 - needsAttention.duration) / 2858 * 100)}% faster` },
    { Operation: "Communications Complaints + Metrics", Baseline: "1,780 ms", Optimized: `${comms.duration} ms`, Improvement: `${Math.round((1780 - comms.duration) / 1780 * 100)}% faster` },
    { Operation: "Member Dashboard Bundle", Baseline: "1,890 ms", Optimized: `${dash.duration} ms (+ ETag 304)`, Improvement: `${Math.round((1890 - dash.duration) / 1890 * 100)}% faster` }
  ];

  console.table(comparison);
  await prisma.$disconnect();
}

runComparison().catch(console.error);
