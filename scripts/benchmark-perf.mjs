import fs from "fs";
import { PrismaClient, Prisma } from "@prisma/client";

const prodEnv = fs.readFileSync("/Users/tanish/Sunshine Web/.production-db-session.local", "utf8");
const match = prodEnv.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("No DATABASE_URL");
const dbUrl = match[1];

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

const DASHBOARD_EXCLUDED_EMAILS = [
  "info.sunshineeldercare@gmail.com",
  "founder@sunshineeldercare.in",
  "developer@sunshineeldercare.in",
  "system@sunshineeldercare.in"
];

const EXCLUDED_MEMBER_EMAILS = [
  "info.sunshineeldercare@gmail.com",
  "founder@sunshineeldercare.in",
  "developer@sunshineeldercare.in",
  "system@sunshineeldercare.in"
];

const ADMIN_DISPLAY_EMAILS = [
  "info.sunshineeldercare@gmail.com",
  "founder@sunshineeldercare.in",
  "developer@sunshineeldercare.in"
];

async function measure(name, fn) {
  // Run once to warm connection, then measure
  const t0 = performance.now();
  const res = await fn();
  const duration = Math.round(performance.now() - t0);
  return { name, duration, resultCount: Array.isArray(res) ? res.length : (res ? 1 : 0) };
}

async function runBenchmarks() {
  console.log("=== STARTING BASELINE DATABASE BENCHMARKS ===");
  // Warm up connection
  await prisma.$queryRaw`SELECT 1 as warmup`;

  const results = [];

  // 1. Dashboard Metrics (Raw SQL aggregation)
  results.push(await measure("Admin Dashboard Metrics Query", async () => {
    const now = new Date();
    return await prisma.$queryRaw(Prisma.sql`
      SELECT
        (
          SELECT COUNT(DISTINCT u.id)::int
          FROM "User" u
          LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
          LEFT JOIN "Subscription" s ON s."userId" = u.id
          WHERE u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)})
            AND u.status != 'ARCHIVED'
            AND u.role != 'ADMIN'
            AND NOT EXISTS (
              SELECT 1 FROM "UserRole" ur JOIN "Role" r ON ur."roleId" = r.id WHERE ur."userId" = u.id AND r.name IN ('Owner', 'Admin')
            )
            AND (u.role = 'MEMBER' OR mp.id IS NOT NULL OR s.id IS NOT NULL)
        ) AS "totalMembers",
        (
          SELECT COUNT(DISTINCT u.id)::int
          FROM "User" u
          JOIN "MemberProfile" mp ON mp."userId" = u.id
          JOIN "Subscription" s ON s."userId" = u.id
          WHERE u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)})
            AND u.email NOT LIKE '%@example.com'
            AND u.status != 'ARCHIVED'
            AND u.role != 'ADMIN'
            AND NOT EXISTS (
              SELECT 1 FROM "UserRole" ur JOIN "Role" r ON ur."roleId" = r.id WHERE ur."userId" = u.id AND r.name IN ('Owner', 'Admin')
            )
            AND s.status = 'ACTIVE'
            AND s."startDate" <= ${now}
            AND s."endDate" >= ${now}
        ) AS "activeMembers",
        (
          SELECT COUNT(*)::int 
          FROM "RenewalRequest" rr
          JOIN "User" u ON rr."userId" = u.id
          WHERE rr.status = 'SUBMITTED' AND u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)})
        ) AS "pendingRenewals",
        (
          SELECT COUNT(*)::int 
          FROM "Payment" p
          JOIN "User" u ON p."userId" = u.id
          WHERE p.status = 'VERIFICATION_PENDING' AND u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)})
        ) AS "pendingPayments",
        (
          SELECT COUNT(*)::int FROM "Inquiry" WHERE status = 'NEW'
        ) AS "newInquiries",
        (
          SELECT COUNT(*)::int FROM "Feedback" WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')
        ) AS "unresolvedFeedback",
        (
          SELECT COUNT(*)::int
          FROM "Subscription" s
          JOIN "User" u ON s."userId" = u.id
          WHERE s.status = 'SCHEDULED' AND u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)}) AND u.role != 'ADMIN'
        ) AS "scheduledMemberships",
        (
          SELECT COUNT(*)::int
          FROM "Subscription" s
          JOIN "User" u ON s."userId" = u.id
          WHERE s.status = 'EXPIRING' AND u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)}) AND u.role != 'ADMIN'
        ) AS "expiringMemberships",
        (
          SELECT COUNT(*)::int
          FROM "Subscription" s
          JOIN "User" u ON s."userId" = u.id
          WHERE s.status = 'EXPIRED' AND u.email NOT IN (${Prisma.join(DASHBOARD_EXCLUDED_EMAILS)}) AND u.role != 'ADMIN'
        ) AS "expiredMemberships"
    `);
  }));

  // 2. Needs Attention Queue (4 findMany queries in parallel)
  results.push(await measure("Needs Attention Queue (4 queries)", async () => {
    return await Promise.all([
      prisma.renewalRequest.findMany({
        where: { status: "SUBMITTED", user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } } },
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
        where: { status: "VERIFICATION_PENDING", user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } } },
        select: { id: true, amount: true, paymentMethod: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);
  }));

  // 3. Members Page 1 (Current full query: findMany 50 members with all nested includes + total count + genuine members unpaginated scan + archived count)
  results.push(await measure("Members Page 1 (Current full query + genuine scan)", async () => {
    const baseWhere = {
      email: { notIn: EXCLUDED_MEMBER_EMAILS },
      status: { not: "ARCHIVED" },
    };
    return await Promise.all([
      prisma.user.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          memberProfile: {
            select: {
              memberId: true,
              salutation: true,
              firstName: true,
              lastName: true,
              spouseSalutation: true,
              spouseFirstName: true,
              spouseLastName: true,
              spouseMobileNumber: true,
              dateOfEnrollment: true,
              serviceAddress: true,
              mobileNumber: true,
              bloodGroup: true,
              medicalConditions: true,
              preferredVisitDay: true,
              preferredVisitTime: true,
              insuranceDetails: { select: { providerName: true, policyNumber: true } }
            }
          },
          subscriptions: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              durationMonths: true,
              variantType: true,
              plan: { select: { name: true } },
              carePlan: { select: { name: true } },
              customPlan: { select: { name: true } },
              careCases: {
                select: {
                  visits: {
                    where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
                    select: { scheduledStart: true, status: true },
                    orderBy: { scheduledStart: 'asc' },
                    take: 1
                  }
                },
                take: 1
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          elders: {
            select: {
              cases: {
                select: {
                  visits: {
                    where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
                    select: { scheduledStart: true, status: true },
                    orderBy: { scheduledStart: 'asc' },
                    take: 1
                  }
                },
                take: 1
              }
            },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50
      }),
      prisma.user.count({ where: baseWhere }),
      // The UNPAGINATED scan of all genuine users across the database:
      prisma.user.findMany({
        where: {
          email: { notIn: [...EXCLUDED_MEMBER_EMAILS, ...ADMIN_DISPLAY_EMAILS] },
          status: { not: "ARCHIVED" },
          OR: [
            { role: "MEMBER" },
            { memberProfile: { memberId: { not: null } } },
            { subscriptions: { some: {} } },
          ],
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.count({ where: { email: { notIn: EXCLUDED_MEMBER_EMAILS }, status: "ARCHIVED" } })
    ]);
  }));

  // 4. Members Search Query (Searching for "Tanish")
  results.push(await measure("Members Search ('Tanish')", async () => {
    const rawQuery = "Tanish";
    const where = {
      AND: [
        { email: { notIn: EXCLUDED_MEMBER_EMAILS }, status: { not: "ARCHIVED" } },
        {
          OR: [
            { name: { contains: rawQuery, mode: 'insensitive' } },
            { email: { contains: rawQuery, mode: 'insensitive' } },
            { memberProfile: { mobileNumber: { contains: rawQuery, mode: 'insensitive' } } },
            { memberProfile: { memberId: { contains: rawQuery, mode: 'insensitive' } } },
          ]
        }
      ]
    };
    return await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        memberProfile: { select: { memberId: true, mobileNumber: true } }
      },
      take: 50
    });
  }));

  // 5. Visit Schedule Week Query (Current Week Visits with joins)
  results.push(await measure("Visit Schedule Week Query (Raw SQL with 7 joins)", async () => {
    const now = new Date();
    const rangeStart = new Date(now.getTime() - 7 * 86400 * 1000);
    const rangeEnd = new Date(now.getTime() + 7 * 86400 * 1000);
    return await prisma.$queryRaw(Prisma.sql`
      SELECT 
        cv.id, cv.status, cv."operationalNotes", cv."scheduledStart", cv."scheduledEnd",
        cv."actualStart", cv."actualEnd", cv."workDescription", cv."completedAt",
        cv."completedById", cv."careCaseId", cv."assignedEmpId",
        e.id AS "elderId", e."firstName" AS "elderFirstName", e."lastName" AS "elderLastName",
        u.id AS "userId", u.name AS "userName", u.email AS "userEmail",
        mp.salutation AS "profileSalutation", mp."firstName" AS "profileFirstName", mp."lastName" AS "profileLastName",
        mp."memberId" AS "profileMemberId", mp."serviceAddress" AS "profileServiceAddress",
        mp."mobileNumber" AS "profileMobileNumber",
        emp.id AS "empId", emp."employeeId" AS "empEmployeeId", emp."firstName" AS "empFirstName",
        emp."lastName" AS "empLastName", emp.designation AS "empDesignation", emp."contactNumber" AS "empContactNumber"
      FROM "CareVisit" cv
      LEFT JOIN "CareCase" cc ON cv."careCaseId" = cc.id
      LEFT JOIN "Elder" e ON cc."elderId" = e.id
      LEFT JOIN "User" u ON e."userId" = u.id
      LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
      LEFT JOIN "Subscription" sub ON cc."subscriptionId" = sub.id
      LEFT JOIN "CarePlan" cp ON sub."carePlanId" = cp.id
      LEFT JOIN "Employee" emp ON cv."assignedEmpId" = emp.id
      WHERE cv."scheduledStart" >= ${rangeStart} AND cv."scheduledStart" <= ${rangeEnd}
      ORDER BY cv."scheduledStart" ASC
    `);
  }));

  // 6. Care Schedule Form Data (searchScheduleMembers("") + activeEmployees)
  results.push(await measure("Care Schedule Form Data (Members + Employees)", async () => {
    return await Promise.all([
      prisma.$queryRaw(Prisma.sql`
        SELECT 
          cc.id AS "id", cc.id AS "careCaseId", false AS "isNewSub",
          e.id AS "elderId", e."firstName" AS "elderFirstName", e."lastName" AS "elderLastName",
          u.name AS "userName", mp."memberId" AS "profileMemberId", mp."serviceAddress" AS "profileServiceAddress"
        FROM "CareCase" cc
        JOIN "Elder" e ON cc."elderId" = e.id
        JOIN "User" u ON e."userId" = u.id
        LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
        WHERE cc.status = 'ACTIVE'
      `),
      prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true },
        orderBy: { firstName: "asc" }
      })
    ]);
  }));

  // 7. Birthday Calendar Query (All non-archived members with DOBs)
  results.push(await measure("Birthday Calendar Query (All confirmed members)", async () => {
    return await prisma.user.findMany({
      where: {
        status: { not: "ARCHIVED" },
        email: { notIn: [...EXCLUDED_MEMBER_EMAILS, ...ADMIN_DISPLAY_EMAILS] },
        memberProfile: {
          memberId: { not: null },
          OR: [
            { dateOfBirth: { not: null } },
            { spouseDateOfBirth: { not: null } },
          ],
        },
      },
      select: {
        id: true,
        email: true,
        status: true,
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            salutation: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            spouseSalutation: true,
            spouseFirstName: true,
            spouseLastName: true,
            spouseDateOfBirth: true,
          }
        }
      }
    });
  }));

  // 8. Employees Page Initial Queries (Admin users + roles + employees)
  results.push(await measure("Employees Page Data (Users + Roles + Employees)", async () => {
    return await Promise.all([
      prisma.user.findMany({
        where: { role: { not: "MEMBER" }, email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
        select: { id: true, name: true, email: true, role: true, status: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.role.findMany({ orderBy: { name: "asc" } }),
      prisma.employee.findMany({ orderBy: { createdAt: "desc" } })
    ]);
  }));

  // 9. Communications Page Queries (Complaints + metrics)
  results.push(await measure("Communications Page (Complaints list + metrics)", async () => {
    return await Promise.all([
      prisma.memberComplaint.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
        take: 50
      }),
      prisma.memberComplaint.count(),
      prisma.memberComplaint.count({ where: { status: "NEW" } }),
      prisma.memberComplaint.count({ where: { status: "IN_PROGRESS" } }),
      prisma.memberComplaint.count({ where: { status: "RESOLVED" } })
    ]);
  }));

  // 10. Member Dashboard Data Query (Single member profile, subscription, events, receipts)
  results.push(await measure("Member Dashboard Data (Single member bundle)", async () => {
    const testMemberId = "SECD1000TAAM";
    const profile = await prisma.memberProfile.findFirst({
      where: { memberId: testMemberId },
      include: { sponsor: true, medicalAuth: true, user: true }
    });
    if (!profile) return null;
    return await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: profile.userId, status: { in: ["ACTIVE", "EXPIRING", "SCHEDULED", "EXPIRED"] } },
        orderBy: { createdAt: "desc" },
        include: { carePlan: true }
      }),
      prisma.receipt.findMany({
        where: { userId: profile.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, receiptNumber: true, amount: true, paymentMethod: true, createdAt: true }
      }),
      prisma.communityEvent.findMany({
        where: { status: "PUBLISHED", visibleToAll: true, eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 10
      })
    ]);
  }));

  console.log("\n--- BASELINE DATABASE QUERY RESULTS ---");
  console.table(results);

  await prisma.$disconnect();
}

runBenchmarks().catch(console.error);
