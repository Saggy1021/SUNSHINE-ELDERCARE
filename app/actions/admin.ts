"use server"

import { cache } from "react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { notificationService } from "@/lib/services/notification"
import { AuthorizationService } from "@/lib/services/authorization"
import { RateLimitService } from "@/lib/services/rate-limit"
import { calculateMembershipEndDate } from "@/lib/services/dates"
import { formatFullMembershipName } from "@/lib/utils/format-membership"
import { formatPreferredSchedule, normalize12HourTime } from "@/lib/services/preferred-schedule"
import { RecurringSchedulerService } from "@/lib/services/recurring-scheduler"
import { EXCLUDED_MEMBER_EMAILS, ADMIN_DISPLAY_EMAILS, DASHBOARD_EXCLUDED_EMAILS } from "@/lib/constants/members"

// --- Authorization Helper ---
async function requirePermission(permission: string) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  const isOwner = session.user.email === 'info.sunshineeldercare@gmail.com';
  
  try {
    await RateLimitService.checkLimit('ADMINISTRATIVE', `user:${session.user.id}`);
  } catch (err: any) {
    if (err?.name === 'RateLimitError') {
      throw new Error('Too many administrative requests. Please wait a moment and try again.');
    }
    // Non-fatal store warning in serverless environment
    console.warn('[requirePermission] RateLimit store warning:', err?.message || err);
  }

  if (!isOwner) {
    await AuthorizationService.require(session.user.id, permission, session.user.email);
  }
  return session.user.id
}

// --- Audit Logger ---
async function logAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: any) {
  await db.auditLog.create({
    data: {
      actorUserId: actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || {}
    }
  })
}

// --- Dashboard & Metrics Core Functions ---
export async function getAdminDashboardMetricsCore(database: any = db, now: Date = new Date()) {
  if (typeof database.$queryRaw === 'function') {
    try {
      const excluded = DASHBOARD_EXCLUDED_EMAILS;
      const rawRows: any[] = await database.$queryRaw(Prisma.sql`
        SELECT
          (
            SELECT COUNT(DISTINCT u.id)::int
            FROM "User" u
            LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
            LEFT JOIN "Subscription" s ON s."userId" = u.id
            WHERE u.email NOT IN (${Prisma.join(excluded)})
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
            WHERE u.email NOT IN (${Prisma.join(excluded)})
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
            WHERE rr.status = 'SUBMITTED' AND u.email NOT IN (${Prisma.join(excluded)})
          ) AS "pendingRenewals",
          (
            SELECT COUNT(*)::int 
            FROM "Payment" p
            JOIN "User" u ON p."userId" = u.id
            WHERE p.status = 'VERIFICATION_PENDING' AND u.email NOT IN (${Prisma.join(excluded)})
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
            WHERE s.status = 'SCHEDULED' AND u.email NOT IN (${Prisma.join(excluded)}) AND u.role != 'ADMIN'
          ) AS "scheduledMemberships",
          (
            SELECT COUNT(*)::int
            FROM "Subscription" s
            JOIN "User" u ON s."userId" = u.id
            WHERE s.status = 'EXPIRING' AND u.email NOT IN (${Prisma.join(excluded)}) AND u.role != 'ADMIN'
          ) AS "expiringMemberships",
          (
            SELECT COUNT(*)::int
            FROM "Subscription" s
            JOIN "User" u ON s."userId" = u.id
            WHERE s.status = 'EXPIRED' AND u.email NOT IN (${Prisma.join(excluded)}) AND u.role != 'ADMIN'
          ) AS "expiredMemberships"
      `);

      if (rawRows && rawRows.length > 0) {
        const r = rawRows[0];
        return {
          totalMembers: Number(r.totalMembers || 0),
          activeMembers: Number(r.activeMembers || 0),
          pendingRenewals: Number(r.pendingRenewals || 0),
          scheduledMemberships: Number(r.scheduledMemberships || 0),
          expiringMemberships: Number(r.expiringMemberships || 0),
          expiredMemberships: Number(r.expiredMemberships || 0),
          newInquiries: Number(r.newInquiries || 0),
          unresolvedFeedback: Number(r.unresolvedFeedback || 0),
          pendingPayments: Number(r.pendingPayments || 0),
        };
      }
    } catch (err) {
      console.warn("[getAdminDashboardMetricsCore] $queryRaw failed, falling back to Prisma query:", err);
    }
  }

  const canUseGroupBy = typeof database.subscription?.groupBy === 'function';

  if (canUseGroupBy) {
    const [
      totalMembers,
      activeMembers,
      pendingRenewals,
      subGroups,
      newInquiries,
      unresolvedFeedback,
      pendingPayments
    ] = await Promise.all([
      // Total Members: Count eligible members (role MEMBER, has memberProfile, or has subscriptions)
      // excluding administrative accounts (Owner, Tanish, Sagnik, and care coordinator accounts) and archived accounts.
      database.user.count({
        where: {
          email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
          status: { not: "ARCHIVED" },
          role: { not: "ADMIN" },
          userRoles: { none: { role: { name: { in: ["Owner", "Admin"] } } } },
          OR: [
            { role: "MEMBER" },
            { memberProfile: { isNot: null } },
            { subscriptions: { some: {} } },
          ],
        },
      }),
      // Active Memberships: Count only currently active memberships belonging to eligible members
      // where subscription status is ACTIVE and within validity dates (startDate <= now <= endDate).
      // Exclude demo/test accounts without genuine active membership and archived members.
      // Avoid counting multiple subscriptions for one member more than once (counts distinct users).
      database.user.count({
        where: {
          email: {
            notIn: DASHBOARD_EXCLUDED_EMAILS,
            not: { endsWith: "@example.com" },
          },
          status: { not: "ARCHIVED" },
          role: { not: "ADMIN" },
          userRoles: { none: { role: { name: { in: ["Owner", "Admin"] } } } },
          memberProfile: { isNot: null },
          subscriptions: {
            some: {
              status: "ACTIVE",
              startDate: { lte: now },
              endDate: { gte: now },
            },
          },
        },
      }),
      database.renewalRequest.count({
        where: {
          status: "SUBMITTED",
          user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
        },
      }),
      database.subscription.groupBy({
        by: ['status'],
        where: {
          status: { in: ['SCHEDULED', 'EXPIRING', 'EXPIRED'] },
          user: {
            email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
            role: { not: "ADMIN" },
          },
        },
        _count: { status: true },
      }),
      database.inquiry.count({ where: { status: "NEW" } }),
      database.feedback.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      database.payment.count({
        where: {
          status: "VERIFICATION_PENDING",
          user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
        },
      }),
    ]);

    const statusMap = new Map(subGroups.map((g: any) => [g.status, g._count?.status || 0]));

    return {
      totalMembers,
      activeMembers,
      pendingRenewals,
      scheduledMemberships: statusMap.get("SCHEDULED") || 0,
      expiringMemberships: statusMap.get("EXPIRING") || 0,
      expiredMemberships: statusMap.get("EXPIRED") || 0,
      newInquiries,
      unresolvedFeedback,
      pendingPayments
    };
  }

  // Fallback for mock testing database
  const [
    totalMembers,
    activeMembers,
    pendingRenewals,
    scheduledMemberships,
    expiringMemberships,
    expiredMemberships,
    newInquiries,
    unresolvedFeedback,
    pendingPayments
  ] = await Promise.all([
    database.user.count({
      where: {
        email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
        status: { not: "ARCHIVED" },
        role: { not: "ADMIN" },
        userRoles: { none: { role: { name: { in: ["Owner", "Admin"] } } } },
        OR: [
          { role: "MEMBER" },
          { memberProfile: { isNot: null } },
          { subscriptions: { some: {} } },
        ],
      },
    }),
    database.user.count({
      where: {
        email: {
          notIn: DASHBOARD_EXCLUDED_EMAILS,
          not: { endsWith: "@example.com" },
        },
        status: { not: "ARCHIVED" },
        role: { not: "ADMIN" },
        userRoles: { none: { role: { name: { in: ["Owner", "Admin"] } } } },
        memberProfile: { isNot: null },
        subscriptions: {
          some: {
            status: "ACTIVE",
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
    }),
    database.renewalRequest.count({
      where: {
        status: "SUBMITTED",
        user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
      },
    }),
    database.subscription.count({
      where: {
        status: "SCHEDULED",
        user: {
          email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
          role: { not: "ADMIN" },
        },
      },
    }),
    database.subscription.count({
      where: {
        status: "EXPIRING",
        user: {
          email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
          role: { not: "ADMIN" },
        },
      },
    }),
    database.subscription.count({
      where: {
        status: "EXPIRED",
        user: {
          email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
          role: { not: "ADMIN" },
        },
      },
    }),
    database.inquiry.count({ where: { status: "NEW" } }),
    database.feedback.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    database.payment.count({
      where: {
        status: "VERIFICATION_PENDING",
        user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
      },
    }),
  ]);

  return {
    totalMembers,
    activeMembers,
    pendingRenewals,
    scheduledMemberships,
    expiringMemberships,
    expiredMemberships,
    newInquiries,
    unresolvedFeedback,
    pendingPayments
  };
}

export async function getAdminDashboardMetrics() {
  await requirePermission("MEMBER_VIEW");
  return getAdminDashboardMetricsCore(db);
}

export async function getNeedsAttentionQueueCore(database: any = db) {
  const [pendingRenewals, newInquiries, unresolvedFeedback, pendingPayments] = await Promise.all([
    database.renewalRequest.findMany({
      where: {
        status: "SUBMITTED",
        user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
      },
      select: {
        id: true,
        planName: true,
        durationMonths: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5
    }),
    database.inquiry.findMany({
      where: { status: "NEW" },
      select: { id: true, fullName: true, message: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    database.feedback.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      select: {
        id: true,
        message: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    database.payment.findMany({
      where: {
        status: "VERIFICATION_PENDING",
        user: { email: { notIn: DASHBOARD_EXCLUDED_EMAILS } },
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        user: { select: { name: true, email: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  return { pendingRenewals, newInquiries, unresolvedFeedback, pendingPayments }
}

export const getNeedsAttentionQueue = cache(async () => {
  await requirePermission("MEMBER_VIEW")
  return getNeedsAttentionQueueCore(db)
})

// --- Members Core Query ---
export async function getMembersCore(
  query?: string,
  page: number = 1,
  limit: number = 50,
  database: any = db,
  hasSensitiveView: boolean = true,
  sortField?: string,
  sortDirection?: "asc" | "desc",
  onlyArchived: boolean = false
) {
  const baseWhere = {
    email: {
      notIn: EXCLUDED_MEMBER_EMAILS,
    },
    status: onlyArchived ? "ARCHIVED" : { not: "ARCHIVED" },
  };

  let where: any = baseWhere;
  if (query && query.trim()) {
    const rawQuery = query.trim();
    const unslashedQuery = rawQuery.replace(/[\/\s-]/g, "");

    const memberIdConditions: any[] = [
      { memberProfile: { memberId: { contains: rawQuery, mode: 'insensitive' as const } } }
    ];

    if (unslashedQuery && unslashedQuery !== rawQuery) {
      memberIdConditions.push(
        { memberProfile: { memberId: { contains: unslashedQuery, mode: 'insensitive' as const } } }
      );
    }

    const slashMatch = unslashedQuery.match(/^SEC([SD])?(\d{1,4})?([A-Z]{1,4})?$/i);
    if (slashMatch && !rawQuery.includes('/')) {
      const type = slashMatch[1] ? `/${slashMatch[1].toUpperCase()}` : '';
      const seq = slashMatch[2] ? `/${slashMatch[2]}` : '';
      const inits = slashMatch[3] ? `/${slashMatch[3].toUpperCase()}` : '';
      const slashedVariant = `SEC${type}${seq}${inits}`;
      if (slashedVariant !== rawQuery) {
        memberIdConditions.push(
          { memberProfile: { memberId: { contains: slashedVariant, mode: 'insensitive' as const } } }
        );
      }
    }

    where = {
      AND: [
        baseWhere,
        {
          OR: [
            { name: { contains: rawQuery, mode: 'insensitive' as const } },
            { email: { contains: rawQuery, mode: 'insensitive' as const } },
            { memberProfile: { mobileNumber: { contains: rawQuery, mode: 'insensitive' as const } } },
            { memberProfile: { spouseMobileNumber: { contains: rawQuery, mode: 'insensitive' as const } } },
            ...memberIdConditions,
          ]
        }
      ]
    };
  }

  // Fast optimized SQL path
  if (typeof database.$queryRaw === "function") {
    try {
      const offset = (page - 1) * limit;
      const statusCondition = onlyArchived
        ? Prisma.sql`AND u.status = 'ARCHIVED'`
        : Prisma.sql`AND u.status != 'ARCHIVED'`;

      let searchCondition = Prisma.empty;
      if (query && query.trim()) {
        const qTrim = query.trim();
        const unslashed = qTrim.replace(/[\/\s-]/g, "");
        const pattern = `%${qTrim}%`;
        const unslashedPattern = `%${unslashed}%`;

        searchCondition = Prisma.sql`
          AND (
            u.name ILIKE ${pattern} OR
            u.email ILIKE ${pattern} OR
            mp."memberId" ILIKE ${pattern} OR
            mp."memberId" ILIKE ${unslashedPattern} OR
            mp."mobileNumber" ILIKE ${pattern} OR
            mp."spouseMobileNumber" ILIKE ${pattern}
          )
        `;
      }

      const [rawRows, total, archivedCount] = await Promise.all([
        database.$queryRaw(Prisma.sql`
          WITH genuine_users AS (
            SELECT 
              u.id,
              ROW_NUMBER() OVER (ORDER BY u."createdAt" ASC)::int AS "serialNumber"
            FROM "User" u
            LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
            WHERE u.email NOT IN (${Prisma.join(EXCLUDED_MEMBER_EMAILS)})
              AND u.status != 'ARCHIVED'
              AND (u.role = 'MEMBER' OR mp."memberId" IS NOT NULL OR EXISTS (SELECT 1 FROM "Subscription" s WHERE s."userId" = u.id))
          )
          SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            u.status,
            u."createdAt",
            gu."serialNumber",
            mp.id AS "profileId",
            mp."memberId",
            mp.salutation,
            mp."firstName",
            mp."lastName",
            mp."spouseSalutation",
            mp."spouseFirstName",
            mp."spouseLastName",
            mp."spouseMobileNumber",
            mp."dateOfEnrollment",
            mp."enrollmentDate",
            mp."serviceAddress",
            mp."mobileNumber",
            mp."bloodGroup",
            mp."medicalConditions",
            mp."preferredVisitDay",
            mp."preferredVisitTime",
            sub.id AS "subId",
            sub.status AS "subStatus",
            sub."startDate" AS "subStartDate",
            sub."endDate" AS "subEndDate",
            sub."durationMonths" AS "subDurationMonths",
            sub."variantType" AS "subVariantType",
            cp.name AS "carePlanName",
            ins."providerName" AS "insuranceProvider",
            v."scheduledStart" AS "scheduledVisitDate"
          FROM "User" u
          LEFT JOIN genuine_users gu ON gu.id = u.id
          LEFT JOIN "MemberProfile" mp ON mp."userId" = u.id
          LEFT JOIN LATERAL (
            SELECT s.id, s.status, s."startDate", s."endDate", s."durationMonths", s."variantType", s."carePlanId"
            FROM "Subscription" s
            WHERE s."userId" = u.id
            ORDER BY s."createdAt" DESC
            LIMIT 1
          ) sub ON true
          LEFT JOIN "CarePlan" cp ON sub."carePlanId" = cp.id
          LEFT JOIN "InsuranceDetails" ins ON ins."memberProfileId" = mp.id
          LEFT JOIN LATERAL (
            SELECT cv."scheduledStart"
            FROM "CareVisit" cv
            JOIN "CareCase" cc ON cv."careCaseId" = cc.id
            WHERE cc."subscriptionId" = sub.id
              AND cv.status IN ('SCHEDULED', 'IN_PROGRESS')
            ORDER BY cv."scheduledStart" ASC
            LIMIT 1
          ) v ON true
          WHERE u.email NOT IN (${Prisma.join(EXCLUDED_MEMBER_EMAILS)})
            ${statusCondition}
            ${searchCondition}
          ORDER BY u."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset};
        `),
        database.user.count({ where }),
        database.user.count({
          where: {
            email: { notIn: EXCLUDED_MEMBER_EMAILS },
            status: "ARCHIVED",
          },
        }),
      ]);

      let enrichedMembers = (rawRows as any[]).map((r) => {
        const planName = r.carePlanName;
        const service = formatFullMembershipName(planName, r.subVariantType, r.subDurationMonths);

        const hasSpouse = Boolean(
          r.spouseFirstName?.trim() || r.spouseLastName?.trim()
        );

        const spouseParts = hasSpouse
          ? [
              r.spouseSalutation?.trim(),
              r.spouseFirstName?.trim(),
              r.spouseLastName?.trim(),
            ].filter(Boolean).join(" ").trim()
          : null;
        const secondaryName = spouseParts || null;

        const scheduledDate = r.scheduledVisitDate ? new Date(r.scheduledVisitDate) : null;
        const medical = hasSensitiveView ? (r.medicalConditions || null) : null;

        return {
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          status: r.status,
          createdAt: r.createdAt,
          serialNumber: r.serialNumber ?? null,
          service,
          secondaryName: secondaryName || null,
          primaryMobile: r.mobileNumber || null,
          secondaryMobile: r.spouseMobileNumber || null,
          scheduledVisitDate: scheduledDate,
          preferredVisitDay: r.preferredVisitDay || null,
          preferredVisitTime: r.preferredVisitTime || null,
          preferredScheduleDisplay: formatPreferredSchedule(
            r.preferredVisitDay,
            r.preferredVisitTime
          ),
          maskedMedicalConditions: medical,
          insuranceProvider: r.insuranceProvider || null,
          memberProfile: r.profileId
            ? {
                memberId: r.memberId,
                salutation: r.salutation,
                firstName: r.firstName,
                lastName: r.lastName,
                spouseSalutation: r.spouseSalutation,
                spouseFirstName: r.spouseFirstName,
                spouseLastName: r.spouseLastName,
                spouseMobileNumber: r.spouseMobileNumber,
                dateOfEnrollment: r.enrollmentDate || r.dateOfEnrollment,
                enrollmentDate: r.enrollmentDate || r.dateOfEnrollment,
                serviceAddress: r.serviceAddress,
                mobileNumber: r.mobileNumber,
                bloodGroup: r.bloodGroup,
                medicalConditions: r.medicalConditions,
                preferredVisitDay: r.preferredVisitDay,
                preferredVisitTime: r.preferredVisitTime,
                insuranceDetails: r.insuranceProvider ? { providerName: r.insuranceProvider } : null,
              }
            : null,
          subscriptions: r.subId
            ? [
                {
                  id: r.subId,
                  status: r.subStatus,
                  startDate: r.subStartDate,
                  endDate: r.subEndDate,
                  durationMonths: r.subDurationMonths,
                  variantType: r.subVariantType,
                  carePlan: r.carePlanName ? { name: r.carePlanName } : null,
                  plan: null,
                  customPlan: null,
                },
              ]
            : [],
        };
      });

      if (sortField) {
        const dir = sortDirection === "desc" ? -1 : 1;
        enrichedMembers.sort((a: any, b: any) => {
          let valA: any = "";
          let valB: any = "";
          switch (sortField) {
            case "serNo":
              valA = a.serialNumber ?? 999999;
              valB = b.serialNumber ?? 999999;
              return (valA - valB) * dir;
            case "mid":
              valA = a.memberProfile?.memberId || "ZZZ";
              valB = b.memberProfile?.memberId || "ZZZ";
              return valA.localeCompare(valB) * dir;
            case "primaryMember":
              valA = a.name || "";
              valB = b.name || "";
              return valA.localeCompare(valB) * dir;
            case "from":
              valA = a.subscriptions?.[0]?.startDate ? new Date(a.subscriptions[0].startDate).getTime() : 0;
              valB = b.subscriptions?.[0]?.startDate ? new Date(b.subscriptions[0].startDate).getTime() : 0;
              return (valA - valB) * dir;
            case "to":
              valA = a.subscriptions?.[0]?.endDate ? new Date(a.subscriptions[0].endDate).getTime() : 0;
              valB = b.subscriptions?.[0]?.endDate ? new Date(b.subscriptions[0].endDate).getTime() : 0;
              return (valA - valB) * dir;
            default:
              return 0;
          }
        });
      }

      return { members: enrichedMembers, total, pages: Math.ceil(total / limit), archivedCount };
    } catch (sqlErr) {
      console.warn("[getMembersCore] Fast SQL query fallback to Prisma:", sqlErr);
    }
  }

  const [members, total, genuineMembers, archivedCount] = await Promise.all([
    database.user.findMany({
      where,
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
            enrollmentDate: true,
            serviceAddress: true,
            mobileNumber: true,
            bloodGroup: true,
            medicalConditions: true,
            preferredVisitDay: true,
            preferredVisitTime: true,
            insuranceDetails: {
              select: {
                providerName: true,
                policyNumber: true,
              }
            }
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
                  where: {
                    status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
                  },
                  select: {
                    scheduledStart: true,
                    status: true,
                  },
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
                  where: {
                    status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
                  },
                  select: {
                    scheduledStart: true,
                    status: true,
                  },
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
      skip: (page - 1) * limit,
      take: limit
    }),
    database.user.count({ where }),
    database.user.findMany({
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
    database.user.count({
      where: {
        email: { notIn: EXCLUDED_MEMBER_EMAILS },
        status: "ARCHIVED",
      },
    }),
  ]);

  const genuineSerialMap = new Map<string, number>();
  genuineMembers.forEach((m: any, idx: number) => {
    genuineSerialMap.set(m.id, idx + 1);
  });

  let enrichedMembers = members.map((m: any) => {
    const sub = m.subscriptions?.[0];
    const planName = sub?.carePlan?.name || sub?.plan?.name || sub?.customPlan?.name;
    const service = formatFullMembershipName(planName, sub?.variantType, sub?.durationMonths);

    const hasSpouse = Boolean(
      m.memberProfile?.spouseFirstName?.trim() ||
      m.memberProfile?.spouseLastName?.trim()
    );

    const spouseParts = hasSpouse
      ? [
          m.memberProfile?.spouseSalutation?.trim(),
          m.memberProfile?.spouseFirstName?.trim(),
          m.memberProfile?.spouseLastName?.trim(),
        ].filter(Boolean).join(" ").trim()
      : null;
    const secondaryName = spouseParts || null;

    // Sourced scheduled visit date
    const visitFromSub = sub?.careCases?.[0]?.visits?.[0]?.scheduledStart;
    const visitFromElder = m.elders?.[0]?.cases?.[0]?.visits?.[0]?.scheduledStart;
    const scheduledDate = visitFromSub || visitFromElder || null;

    // Restrict medical information to authorized administrators
    const medical = hasSensitiveView ? (m.memberProfile?.medicalConditions || null) : null;

    // Health Insurance
    const insuranceProvider = m.memberProfile?.insuranceDetails?.providerName || null;

    return {
      ...m,
      name: m.name,
      serialNumber: genuineSerialMap.get(m.id) ?? null,
      service,
      secondaryName: secondaryName || null,
      primaryMobile: m.memberProfile?.mobileNumber || null,
      secondaryMobile: m.memberProfile?.spouseMobileNumber || null,
      scheduledVisitDate: scheduledDate,
      preferredVisitDay: m.memberProfile?.preferredVisitDay || null,
      preferredVisitTime: m.memberProfile?.preferredVisitTime || null,
      preferredScheduleDisplay: formatPreferredSchedule(
        m.memberProfile?.preferredVisitDay,
        m.memberProfile?.preferredVisitTime
      ),
      maskedMedicalConditions: medical,
      insuranceProvider: insuranceProvider,
    };
  });

  // Optional server-side sorting
  if (sortField) {
    const dir = sortDirection === "desc" ? -1 : 1;
    enrichedMembers.sort((a: any, b: any) => {
      let valA: any = "";
      let valB: any = "";
      switch (sortField) {
        case "serNo":
          valA = a.serialNumber ?? 999999;
          valB = b.serialNumber ?? 999999;
          return (valA - valB) * dir;
        case "mid":
          valA = a.memberProfile?.memberId || "ZZZ";
          valB = b.memberProfile?.memberId || "ZZZ";
          return valA.localeCompare(valB) * dir;
        case "primaryMember":
          valA = a.name || "";
          valB = b.name || "";
          return valA.localeCompare(valB) * dir;
        case "from":
          valA = a.subscriptions?.[0]?.startDate ? new Date(a.subscriptions[0].startDate).getTime() : 0;
          valB = b.subscriptions?.[0]?.startDate ? new Date(b.subscriptions[0].startDate).getTime() : 0;
          return (valA - valB) * dir;
        case "to":
          valA = a.subscriptions?.[0]?.endDate ? new Date(a.subscriptions[0].endDate).getTime() : 0;
          valB = b.subscriptions?.[0]?.endDate ? new Date(b.subscriptions[0].endDate).getTime() : 0;
          return (valA - valB) * dir;
        default:
          return 0;
      }
    });
  }

  return { members: enrichedMembers, total, pages: Math.ceil(total / limit), archivedCount };
}

// --- Members Server Action ---
export async function getMembers(
  query?: string,
  page: number = 1,
  limit: number = 50,
  sortField?: string,
  sortDirection?: "asc" | "desc",
  onlyArchived: boolean = false
) {
  const sessionUser = await requirePermission("MEMBER_VIEW");
  const session = await auth();
  const hasSensitiveView = await AuthorizationService.can(sessionUser, "MEMBER_SENSITIVE_VIEW", session?.user?.email || undefined);
  return getMembersCore(query, page, limit, db, hasSensitiveView, sortField, sortDirection, onlyArchived);
}

// --- Membership Date Modification Core Logic ---
export async function updateMembershipDatesCore(
  subscriptionId: string,
  newStartDateStr: string,
  newEndDateStr?: string | null,
  sessionUserId: string = "system",
  database: any = db
) {
  if (!newStartDateStr) {
    return { success: false, error: "A valid start date is required." };
  }

  const newStartDate = new Date(newStartDateStr);
  if (isNaN(newStartDate.getTime())) {
    return { success: false, error: "Invalid start date format." };
  }

  const subscription = await database.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { success: false, error: "Subscription record not found." };
  }

  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") {
    return {
      success: false,
      error: "Cannot modify historical expired or cancelled membership periods.",
    };
  }

  const durationMonths = subscription.durationMonths || 1;
  const calculatedEndDate = calculateMembershipEndDate(newStartDate, durationMonths);

  let finalEndDate = calculatedEndDate;
  let isManualEndDate = false;

  if (newEndDateStr) {
    const parsedEndDate = new Date(newEndDateStr);
    if (isNaN(parsedEndDate.getTime())) {
      return { success: false, error: "Invalid end date format." };
    }
    if (parsedEndDate <= newStartDate) {
      return { success: false, error: "Membership end date must be later than start date." };
    }
    finalEndDate = parsedEndDate;
    isManualEndDate = finalEndDate.getTime() !== calculatedEndDate.getTime();
  }

  await database.$transaction(async (tx: any) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        startDate: newStartDate,
        endDate: finalEndDate,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "MEMBERSHIP_DATES_UPDATED",
        entityType: "SUBSCRIPTION",
        entityId: subscription.id,
        actorUserId: sessionUserId,
        metadata: {
          userId: subscription.userId,
          previousStartDate: subscription.startDate,
          previousEndDate: subscription.endDate,
          newStartDate,
          newEndDate: finalEndDate,
          calculatedEndDate,
          isManualEndDate,
          durationMonths,
        },
      },
    });
  });

  return {
    success: true,
    startDate: newStartDate,
    endDate: finalEndDate,
    isManualEndDate,
  };
}

export async function updateMembershipDates(
  subscriptionId: string,
  newStartDateStr: string,
  newEndDateStr?: string | null
) {
  const sessionUserId = await requirePermission("MEMBER_MANAGE");
  const result = await updateMembershipDatesCore(subscriptionId, newStartDateStr, newEndDateStr, sessionUserId, db);
  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/members");
    const sub = await db.subscription.findUnique({ where: { id: subscriptionId }, select: { userId: true } });
    if (sub?.userId) {
      revalidatePath(`/admin/members/${sub.userId}`);
    }
  }
  return result;
}

export async function updateMembershipStartDateCore(
  subscriptionId: string,
  newStartDateStr: string,
  sessionUserId: string,
  database: any = db
) {
  return updateMembershipDatesCore(subscriptionId, newStartDateStr, null, sessionUserId, database);
}

export async function updateMembershipStartDate(
  subscriptionId: string,
  newStartDateStr: string
) {
  return updateMembershipDates(subscriptionId, newStartDateStr, null);
}

// --- Comprehensive Member Profile Editing ---
export interface AdminUpdateMemberInput {
  userId: string;
  salutation?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  alternateNumber?: string | null;
  serviceAddress?: string | null;
  nearestLandmark?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  bloodGroup?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;

  // Spouse / Secondary Member
  hasSpouse?: boolean;
  spouseSalutation?: string | null;
  spouseFirstName?: string | null;
  spouseLastName?: string | null;
  spouseMobileNumber?: string | null;
  spouseDateOfBirth?: string | Date | null;
  spouseGender?: string | null;
  spouseIdProofType?: string | null;
  spouseIdProofNumber?: string | null;

  // Membership & Dates
  dateOfEnrollment?: string | Date | null;
  enrollmentDate?: string | Date | null;
  carePlanId?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  durationMonths?: number | null;

  // Medical & Health Profile
  medicalConditions?: string | null;
  hospitalForSos?: string | null;
  shiftAuthorization?: boolean;

  // Insurance
  insuranceProvider?: string | null;
  policyNumber?: string | null;
  coverageAmount?: string | null;

  // Contacts
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactAlternatePhone?: string | null;
  emergencyContactEmail?: string | null;

  sponsorSalutation?: string | null;
  sponsorFirstName?: string | null;
  sponsorLastName?: string | null;
  sponsorName?: string | null;
  sponsorRelationship?: string | null;
  sponsorMobile?: string | null;
  sponsorAlternateNumber?: string | null;
  sponsorEmail?: string | null;

  // Preferred Care Visit Schedule
  preferredVisitDay?: string | null;
  preferredVisitTime?: string | null;
  preferredVisitFrequency?: string | null;
  preferredVisitFortnightlyPattern?: string | null;
}

export async function adminUpdateMemberCore(
  input: AdminUpdateMemberInput,
  actorUserId: string,
  database: any = db,
  hasSensitiveView: boolean = true
): Promise<{ success: boolean; error?: string; userId?: string }> {
  if (!input.userId) {
    return { success: false, error: "Member ID is required." };
  }
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    return { success: false, error: "First and last name are required." };
  }
  if (!input.email?.trim()) {
    return { success: false, error: "Email address is required." };
  }
  if (!input.mobileNumber?.trim()) {
    return { success: false, error: "Primary mobile number is required." };
  }

  const cleanMobile = input.mobileNumber.replace(/\D/g, "");
  if (cleanMobile.length < 10) {
    return { success: false, error: "Primary mobile number must be at least 10 digits." };
  }

  if (input.spouseMobileNumber?.trim()) {
    const cleanSpouseMobile = input.spouseMobileNumber.replace(/\D/g, "");
    if (cleanSpouseMobile.length < 10) {
      return { success: false, error: "Secondary mobile number must be at least 10 digits." };
    }
  }

  try {
    return await database.$transaction(async (tx: any) => {
      // 1. Fetch current user and profile for before snapshot
      const currentUser = await tx.user.findUnique({
        where: { id: input.userId },
        include: {
          memberProfile: {
            include: {
              sponsor: true,
              insuranceDetails: true,
              medicalAuth: true,
            }
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          emergencyContact: true,
        }
      });

      if (!currentUser) {
        return { success: false, error: "Member not found." };
      }

      // 2. Check email uniqueness if email changed
      const normalizedEmail = input.email.toLowerCase().trim();
      if (normalizedEmail !== currentUser.email.toLowerCase()) {
        const existingByEmail = await tx.user.findUnique({
          where: { email: normalizedEmail }
        });
        if (existingByEmail && existingByEmail.id !== currentUser.id) {
          return { success: false, error: "Email address is already in use by another account." };
        }
      }

      const beforeSnapshot = {
        name: currentUser.name,
        email: currentUser.email,
        profile: currentUser.memberProfile ? {
          firstName: currentUser.memberProfile.firstName,
          lastName: currentUser.memberProfile.lastName,
          mobileNumber: currentUser.memberProfile.mobileNumber,
          serviceAddress: currentUser.memberProfile.serviceAddress,
          spouseFirstName: currentUser.memberProfile.spouseFirstName,
          spouseLastName: currentUser.memberProfile.spouseLastName,
          spouseMobileNumber: currentUser.memberProfile.spouseMobileNumber,
          bloodGroup: currentUser.memberProfile.bloodGroup,
          dateOfEnrollment: currentUser.memberProfile.dateOfEnrollment,
        } : null,
      };

      // 3. Update User record
      const salutation = (input.salutation || "").trim() || (currentUser.memberProfile?.salutation || "Mr");
      const fullName = `${salutation} ${input.firstName.trim()} ${input.lastName.trim()}`.trim();
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          name: fullName,
          email: normalizedEmail,
        }
      });

      // 4. Update or Upsert MemberProfile record
      // CRITICAL: Member ID is strictly PRESERVED! Never modify or overwrite memberId.
      const profileData: any = {
        salutation,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: normalizedEmail,
        mobileNumber: input.mobileNumber.trim(),
        alternateNumber: input.alternateNumber?.trim() || null,
        serviceAddress: input.serviceAddress?.trim() || null,
        nearestLandmark: input.nearestLandmark?.trim() || null,
        gender: input.gender || null,
        bloodGroup: input.bloodGroup || null,
        idProofType: input.idProofType || null,
      };

      if (input.dateOfBirth) {
        profileData.dateOfBirth = new Date(input.dateOfBirth);
      } else if (input.dateOfBirth === null || input.dateOfBirth === "") {
        profileData.dateOfBirth = null;
      }

      if (input.idProofNumber !== undefined && input.idProofNumber !== null) {
        profileData.idProofNumber = input.idProofNumber.trim() || null;
      }

      const enrollmentInput = input.enrollmentDate !== undefined ? input.enrollmentDate : input.dateOfEnrollment;
      if (enrollmentInput) {
        const parsedEnrollment = new Date(enrollmentInput);
        if (!isNaN(parsedEnrollment.getTime())) {
          profileData.enrollmentDate = parsedEnrollment;
          profileData.dateOfEnrollment = parsedEnrollment;
        }
      } else if (enrollmentInput === null || enrollmentInput === "") {
        profileData.enrollmentDate = null;
        profileData.dateOfEnrollment = null;
      }

      // Spouse handling:
      // If hasSpouse is explicitly false, clear spouse fields.
      if (input.hasSpouse === false) {
        profileData.spouseSalutation = null;
        profileData.spouseFirstName = null;
        profileData.spouseLastName = null;
        profileData.spouseMobileNumber = null;
        profileData.spouseDateOfBirth = null;
        profileData.spouseGender = null;
        profileData.spouseIdProofType = null;
        profileData.spouseIdProofNumber = null;
      } else if (input.hasSpouse === true || input.spouseFirstName || input.spouseLastName || input.spouseMobileNumber) {
        profileData.spouseSalutation = (input.spouseSalutation || "").trim() || (currentUser.memberProfile?.spouseSalutation || "Mr");
        profileData.spouseFirstName = input.spouseFirstName?.trim() || null;
        profileData.spouseLastName = input.spouseLastName?.trim() || null;
        profileData.spouseMobileNumber = input.spouseMobileNumber?.trim() || null;
        profileData.spouseGender = input.spouseGender || null;
        profileData.spouseIdProofType = input.spouseIdProofType || null;
        if (input.spouseIdProofNumber !== undefined && input.spouseIdProofNumber !== null) {
          profileData.spouseIdProofNumber = input.spouseIdProofNumber.trim() || null;
        }
        if (input.spouseDateOfBirth) {
          profileData.spouseDateOfBirth = new Date(input.spouseDateOfBirth);
        } else if (input.spouseDateOfBirth === null || input.spouseDateOfBirth === "") {
          profileData.spouseDateOfBirth = null;
        }
      }

      // Medical conditions: Only update if actor has sensitive view permission
      if (hasSensitiveView && input.medicalConditions !== undefined) {
        profileData.medicalConditions = input.medicalConditions?.trim() || null;
      }

      // Preferred Care Visit Schedule
      if (input.preferredVisitDay !== undefined) {
        profileData.preferredVisitDay = input.preferredVisitDay?.trim() || null;
      }
      if (input.preferredVisitTime !== undefined) {
        profileData.preferredVisitTime = normalize12HourTime(input.preferredVisitTime);
      }
      if (input.preferredVisitFrequency !== undefined) {
        profileData.preferredVisitFrequency = input.preferredVisitFrequency?.trim() || "WEEKLY";
      }
      if (input.preferredVisitFortnightlyPattern !== undefined) {
        profileData.preferredVisitFortnightlyPattern = input.preferredVisitFortnightlyPattern?.trim() || null;
      }

      let memberProfileId: string;
      if (currentUser.memberProfile) {
        memberProfileId = currentUser.memberProfile.id;
        await tx.memberProfile.update({
          where: { id: memberProfileId },
          data: profileData,
        });
      } else {
        const createdProfile = await tx.memberProfile.create({
          data: {
            userId: currentUser.id,
            ...profileData,
          }
        });
        memberProfileId = createdProfile.id;
      }

      // Automatically sync or generate recurring visits when care visit preferences are touched
      if (
        input.preferredVisitDay !== undefined ||
        input.preferredVisitTime !== undefined ||
        input.preferredVisitFrequency !== undefined ||
        input.preferredVisitFortnightlyPattern !== undefined
      ) {
        await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
          memberProfileId,
          newPreferredDay: profileData.preferredVisitDay,
          newPreferredTime: profileData.preferredVisitTime,
          newFrequency: profileData.preferredVisitFrequency,
          newFortnightlyPattern: profileData.preferredVisitFortnightlyPattern,
          actorUserId,
        });
      }

      // 5. Update Subscription Dates & Plan if provided
      const sub = currentUser.subscriptions?.[0];
      if (sub) {
        const subData: any = {};
        if (input.startDate) {
          subData.startDate = new Date(input.startDate);
        }
        if (input.endDate) {
          subData.endDate = new Date(input.endDate);
        }
        if (input.carePlanId) {
          subData.carePlanId = input.carePlanId;
        }
        if (input.durationMonths && input.durationMonths > 0) {
          subData.durationMonths = input.durationMonths;
        }
        if (Object.keys(subData).length > 0) {
          await tx.subscription.update({
            where: { id: sub.id },
            data: subData,
          });
        }
      }

      // 6. Emergency Contact
      if (input.emergencyContactName !== undefined || input.emergencyContactPhone !== undefined) {
        if (input.emergencyContactName?.trim() || input.emergencyContactPhone?.trim()) {
          await tx.emergencyContact.upsert({
            where: { userId: currentUser.id },
            update: {
              fullName: input.emergencyContactName?.trim() || "Emergency Contact",
              relationship: input.emergencyContactRelationship?.trim() || "Contact",
              phone: input.emergencyContactPhone?.trim() || "",
              alternatePhone: input.emergencyContactAlternatePhone?.trim() || null,
              email: input.emergencyContactEmail?.trim() || null,
            },
            create: {
              userId: currentUser.id,
              fullName: input.emergencyContactName?.trim() || "Emergency Contact",
              relationship: input.emergencyContactRelationship?.trim() || "Contact",
              phone: input.emergencyContactPhone?.trim() || "",
              alternatePhone: input.emergencyContactAlternatePhone?.trim() || null,
              email: input.emergencyContactEmail?.trim() || null,
            }
          });
        }
      }

      // 7. Sponsor Details: 3-field structure (Salutation, First Name, Last Name)
      const sponsorFirstName = input.sponsorFirstName?.trim() || (input.sponsorName ? input.sponsorName.trim().split(/\s+/)[0] : "");
      const sponsorLastName = input.sponsorLastName?.trim() || (input.sponsorName ? input.sponsorName.trim().split(/\s+/).slice(1).join(" ") : "");
      const hasSponsorData = Boolean(sponsorFirstName || sponsorLastName || input.sponsorName?.trim() || input.sponsorMobile?.trim());

      if (hasSponsorData || input.sponsorName !== undefined) {
        const sponsorSalutation = (input.sponsorSalutation || "").trim() || (currentUser.memberProfile?.sponsor?.salutation || "Mr");
        const sponsorFullName = [sponsorSalutation, sponsorFirstName, sponsorLastName].filter(Boolean).join(" ") || input.sponsorName?.trim() || "Sponsor";

        await tx.sponsor.upsert({
          where: { memberProfileId: memberProfileId },
          update: {
            salutation: sponsorSalutation,
            firstName: sponsorFirstName || null,
            lastName: sponsorLastName || null,
            fullName: sponsorFullName,
            relationship: input.sponsorRelationship?.trim() || "Sponsor",
            mobileNumber: input.sponsorMobile?.trim() || "",
            alternateNumber: input.sponsorAlternateNumber?.trim() || null,
            email: input.sponsorEmail?.trim() || null,
          },
          create: {
            memberProfileId: memberProfileId,
            salutation: sponsorSalutation,
            firstName: sponsorFirstName || null,
            lastName: sponsorLastName || null,
            fullName: sponsorFullName,
            relationship: input.sponsorRelationship?.trim() || "Sponsor",
            mobileNumber: input.sponsorMobile?.trim() || "",
            alternateNumber: input.sponsorAlternateNumber?.trim() || null,
            email: input.sponsorEmail?.trim() || null,
          }
        });
      }

      // 8. Insurance Details
      if (input.insuranceProvider !== undefined || input.policyNumber !== undefined) {
        if (input.insuranceProvider?.trim() || input.policyNumber?.trim()) {
          await tx.insuranceDetails.upsert({
            where: { memberProfileId: memberProfileId },
            update: {
              providerName: input.insuranceProvider?.trim() || "Insurance",
              policyNumber: input.policyNumber?.trim() || "N/A",
              coverageAmount: input.coverageAmount?.trim() || null,
            },
            create: {
              memberProfileId: memberProfileId,
              providerName: input.insuranceProvider?.trim() || "Insurance",
              policyNumber: input.policyNumber?.trim() || "N/A",
              coverageAmount: input.coverageAmount?.trim() || null,
            }
          });
        }
      }

      // 9. Medical Authorization
      if (input.hospitalForSos !== undefined || input.shiftAuthorization !== undefined) {
        await tx.medicalAuthorization.upsert({
          where: { memberProfileId: memberProfileId },
          update: {
            hospitalForSos: input.hospitalForSos?.trim() || null,
            shiftAuthorization: Boolean(input.shiftAuthorization),
          },
          create: {
            memberProfileId: memberProfileId,
            hospitalForSos: input.hospitalForSos?.trim() || null,
            shiftAuthorization: Boolean(input.shiftAuthorization),
          }
        });
      }

      // 10. Audit Log with meaningful before/after changes
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "MEMBER_UPDATED_BY_ADMIN",
          entityType: "USER",
          entityId: currentUser.id,
          metadata: {
            before: beforeSnapshot,
            after: {
              name: fullName,
              email: normalizedEmail,
              mobileNumber: input.mobileNumber.trim(),
              spouseName: input.spouseFirstName ? `${input.spouseFirstName} ${input.spouseLastName || ""}`.trim() : null,
              spouseMobileNumber: input.spouseMobileNumber?.trim() || null,
              dateOfEnrollment: input.dateOfEnrollment || null,
            },
            memberId: currentUser.memberProfile?.memberId || "UNASSIGNED",
          }
        }
      });

      return { success: true, userId: currentUser.id };
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update member." };
  }
}

export async function adminUpdateMember(formData: FormData) {
  const sessionUser = await requirePermission("MEMBER_MANAGE");
  try {
    await RateLimitService.checkLimit("ADMINISTRATIVE");
  } catch (error: any) {
    if (error?.name === "RateLimitError") {
      return { success: false, error: "Too many requests. Please try again later." };
    }
  }

  const hasSensitiveView = await AuthorizationService.can(sessionUser, "MEMBER_SENSITIVE_VIEW");

  const userId = formData.get("userId") as string;
  const salutation = formData.get("salutation") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const mobileNumber = formData.get("mobileNumber") as string;
  const alternateNumber = formData.get("alternateNumber") as string;
  const serviceAddress = formData.get("serviceAddress") as string;
  const nearestLandmark = formData.get("nearestLandmark") as string;
  const dateOfBirth = formData.get("dateOfBirth") as string;
  const gender = formData.get("gender") as string;
  const bloodGroup = formData.get("bloodGroup") as string;
  const idProofType = formData.get("idProofType") as string;
  const idProofNumber = formData.get("idProofNumber") as string;

  const hasSpouseStr = formData.get("hasSpouse") as string;
  const hasSpouse = hasSpouseStr === "true" || hasSpouseStr === "1" || hasSpouseStr === "on";
  const spouseSalutation = formData.get("spouseSalutation") as string;
  const spouseFirstName = formData.get("spouseFirstName") as string;
  const spouseLastName = formData.get("spouseLastName") as string;
  const spouseMobileNumber = formData.get("spouseMobileNumber") as string;
  const spouseDateOfBirth = formData.get("spouseDateOfBirth") as string;
  const spouseGender = formData.get("spouseGender") as string;
  const spouseIdProofType = formData.get("spouseIdProofType") as string;
  const spouseIdProofNumber = formData.get("spouseIdProofNumber") as string;

  const dateOfEnrollment = formData.get("dateOfEnrollment") as string;
  const enrollmentDate = (formData.get("enrollmentDate") as string) || dateOfEnrollment;
  const carePlanId = formData.get("carePlanId") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const durationMonthsStr = formData.get("durationMonths") as string;
  const durationMonths = durationMonthsStr ? parseInt(durationMonthsStr, 10) : undefined;

  const medicalConditions = formData.get("medicalConditions") as string;
  const hospitalForSos = formData.get("hospitalForSos") as string;
  const shiftAuthorization = formData.get("shiftAuthorization") === "true" || formData.get("shiftAuthorization") === "on";

  const insuranceProvider = formData.get("insuranceProvider") as string;
  const policyNumber = formData.get("policyNumber") as string;
  const coverageAmount = formData.get("coverageAmount") as string;

  const emergencyContactName = formData.get("emergencyContactName") as string;
  const emergencyContactRelationship = formData.get("emergencyContactRelationship") as string;
  const emergencyContactPhone = formData.get("emergencyContactPhone") as string;
  const emergencyContactAlternatePhone = formData.get("emergencyContactAlternatePhone") as string;
  const emergencyContactEmail = formData.get("emergencyContactEmail") as string;

  const sponsorSalutation = formData.get("sponsorSalutation") as string;
  const sponsorFirstName = formData.get("sponsorFirstName") as string;
  const sponsorLastName = formData.get("sponsorLastName") as string;
  const sponsorName = formData.get("sponsorName") as string;
  const sponsorRelationship = formData.get("sponsorRelationship") as string;
  const sponsorMobile = formData.get("sponsorMobile") as string;
  const sponsorAlternateNumber = formData.get("sponsorAlternateNumber") as string;
  const sponsorEmail = formData.get("sponsorEmail") as string;

  const preferredVisitDay = formData.has("preferredVisitDay") ? (formData.get("preferredVisitDay") as string) : undefined;
  const preferredVisitTime = formData.has("preferredVisitTime") ? (formData.get("preferredVisitTime") as string) : undefined;
  const preferredVisitFrequency = formData.has("preferredVisitFrequency") ? (formData.get("preferredVisitFrequency") as string) : undefined;
  const preferredVisitFortnightlyPattern = formData.has("preferredVisitFortnightlyPattern") ? (formData.get("preferredVisitFortnightlyPattern") as string) : undefined;

  const input: AdminUpdateMemberInput = {
    userId,
    salutation: salutation || null,
    firstName,
    lastName,
    email,
    mobileNumber,
    alternateNumber: alternateNumber || null,
    serviceAddress: serviceAddress || null,
    nearestLandmark: nearestLandmark || null,
    dateOfBirth: dateOfBirth || null,
    gender: gender || null,
    bloodGroup: bloodGroup || null,
    idProofType: idProofType || null,
    idProofNumber: idProofNumber || null,

    hasSpouse,
    spouseSalutation: spouseSalutation || null,
    spouseFirstName: spouseFirstName || null,
    spouseLastName: spouseLastName || null,
    spouseMobileNumber: spouseMobileNumber || null,
    spouseDateOfBirth: spouseDateOfBirth || null,
    spouseGender: spouseGender || null,
    spouseIdProofType: spouseIdProofType || null,
    spouseIdProofNumber: spouseIdProofNumber || null,

    dateOfEnrollment: dateOfEnrollment || null,
    enrollmentDate: enrollmentDate || null,
    carePlanId: carePlanId || null,
    startDate: startDate || null,
    endDate: endDate || null,
    durationMonths: durationMonths || null,

    medicalConditions: medicalConditions !== null ? medicalConditions : undefined,
    hospitalForSos: hospitalForSos || null,
    shiftAuthorization,

    insuranceProvider: insuranceProvider || null,
    policyNumber: policyNumber || null,
    coverageAmount: coverageAmount || null,

    emergencyContactName: emergencyContactName || null,
    emergencyContactRelationship: emergencyContactRelationship || null,
    emergencyContactPhone: emergencyContactPhone || null,
    emergencyContactAlternatePhone: emergencyContactAlternatePhone || null,
    emergencyContactEmail: emergencyContactEmail || null,

    sponsorSalutation: sponsorSalutation || null,
    sponsorFirstName: sponsorFirstName || null,
    sponsorLastName: sponsorLastName || null,
    sponsorName: sponsorName || null,
    sponsorRelationship: sponsorRelationship || null,
    sponsorMobile: sponsorMobile || null,
    sponsorAlternateNumber: sponsorAlternateNumber || null,
    sponsorEmail: sponsorEmail || null,

    preferredVisitDay: preferredVisitDay !== undefined ? (preferredVisitDay.trim() || null) : undefined,
    preferredVisitTime: preferredVisitTime !== undefined ? (preferredVisitTime.trim() || null) : undefined,
    preferredVisitFrequency: preferredVisitFrequency !== undefined ? (preferredVisitFrequency.trim() || null) : undefined,
    preferredVisitFortnightlyPattern: preferredVisitFortnightlyPattern !== undefined ? (preferredVisitFortnightlyPattern.trim() || null) : undefined,
  };

  const result = await adminUpdateMemberCore(input, sessionUser, db, hasSensitiveView);
  if (result.success && result.userId) {
    revalidatePath("/admin");
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${result.userId}`);
    revalidatePath(`/admin/members/${result.userId}/edit`);
    revalidatePath("/admin/schedule");
  }
  return result;
}

export async function getMemberDetails(userId: string) {
  const sessionUser = await requirePermission("MEMBER_VIEW")
  const session = await auth()

  // Check if they have sensitive view
  const hasSensitiveView = await AuthorizationService.can(sessionUser, "MEMBER_SENSITIVE_VIEW", session?.user?.email || undefined);

  // Consolidate relational fetching to eliminate connection pool contention and round-trips
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberProfile: {
        include: {
          sponsor: true,
          insuranceDetails: true,
          medicalAuth: true,
          idProofDocument: true,
          spouseIdProofDocument: true,
        }
      },
      subscriptions: {
        include: { carePlan: true, addOns: { include: { addOn: true } }, customPlan: true },
        orderBy: { createdAt: 'desc' }
      },
      renewalRequests: {
        orderBy: { createdAt: 'desc' }
      },
      emergencyContact: true,
      feedback: {
        orderBy: { createdAt: 'desc' }
      },
      invoices: {
        where: { invoiceNumber: { not: null } },
        orderBy: { issueDate: 'desc' }
      },
      receipts: {
        orderBy: { createdAt: 'desc' }
      },
      payments: {
        orderBy: { createdAt: 'desc' }
      },
    }
  });

  if (!user) {
    return null;
  }

  const profileId = user.memberProfile?.id;
  const [ownedDocuments, auditLogs] = await Promise.all([
    db.memberDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }),
    db.auditLog.findMany({
      where: {
        OR: [
          { actorUserId: userId },
          { entityId: userId, entityType: 'USER' },
          ...(profileId ? [{ entityId: profileId, entityType: 'MEMBER_PROFILE' }] : []),
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })
  ]);

  const fullUser: any = {
    ...user,
    ownedDocuments,
    auditLogs
  };

  if (!hasSensitiveView) {
    if (fullUser.memberProfile) {
      fullUser.memberProfile.idProofNumber = null as any;
      fullUser.memberProfile.spouseIdProofNumber = null as any;
      fullUser.memberProfile.idProofDocument = null as any;
      fullUser.memberProfile.spouseIdProofDocument = null as any;
    }
    if (fullUser.ownedDocuments) {
      fullUser.ownedDocuments = fullUser.ownedDocuments.filter((d: any) => d.documentType !== 'ID_PROOF');
    }
    if (fullUser.memberProfile?.insuranceDetails) {
      fullUser.memberProfile.insuranceDetails.policyNumber = "HIDDEN";
      fullUser.memberProfile.insuranceDetails.coverageAmount = "HIDDEN";
    }
    if (fullUser.memberProfile?.medicalAuth) {
      fullUser.memberProfile.medicalAuth.hospitalForSos = "HIDDEN";
    }
    if (fullUser.emergencyContact) {
      fullUser.emergencyContact.phone = "HIDDEN";
      fullUser.emergencyContact.alternatePhone = "HIDDEN";
    }
  }

  return fullUser;
}

// --- Renewal Requests ---
export async function getRenewalRequests() {
  await requirePermission("RENEWAL_VIEW")

  return db.renewalRequest.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function approveRenewalRequest(formData: FormData) {
  const adminId = await requirePermission("RENEWAL_APPROVE")

  const requestId = formData.get("requestId") as string

  const request = await db.renewalRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new Error("Renewal request not found")
  if (request.status !== "SUBMITTED") throw new Error("Can only approve SUBMITTED requests")

  let customPrice = undefined
  if (request.requestType === "UPGRADE") {
    if (!request.currentSubscriptionId) {
      throw new Error("Business rule missing: Mid-cycle upgrade calculation is not defined for subscriptions without history.")
    }
    
    const currentSub = await db.subscription.findUnique({
      where: { id: request.currentSubscriptionId },
      include: { carePlan: true }
    })
    
    if (!currentSub || !currentSub.carePlan) {
      throw new Error("Business rule missing: Cannot calculate upgrade without an active standard care plan.")
    }
    
    const { carePricingService } = await import('@/lib/services/care-plans')
    
    // Authoritative current pricing lookup
    const currentPricing = await carePricingService.lookupPrice({
      planSlug: currentSub.carePlan.slug,
      variantType: (currentSub.variantType as "SINGLE" | "COUPLE") || "SINGLE",
      months: currentSub.durationMonths || 1
    })
    
    // Authoritative target pricing lookup
    const targetPlan = await db.carePlan.findUnique({ where: { id: request.carePlanId } })
    if (!targetPlan) throw new Error("Target plan no longer exists")

    const targetPricing = await carePricingService.lookupPrice({
      planSlug: targetPlan.slug,
      variantType: (request.variantType as "SINGLE" | "COUPLE") || "SINGLE",
      months: request.durationMonths || 1
    })
    
    const targetTotal = targetPricing.documentedTotal
    const currentTotal = currentPricing.documentedTotal
    
    const diff = targetTotal - currentTotal
    if (diff < 0) {
      throw new Error("Mid-cycle downgrade is not allowed.")
    }
    
    customPrice = diff
  }

  // Transition RenewalRequest to APPROVED
  await db.renewalRequest.update({
    where: { id: requestId },
    data: { 
      status: "APPROVED",
      ...(customPrice !== undefined && { customPrice })
    }
  })

  await logAudit(adminId, "RENEWAL_APPROVED", "RenewalRequest", requestId, { 
    planName: request.planName, 
    variant: request.variantType 
  })
  
  revalidatePath('/admin')
  revalidatePath('/admin/renewals')
  notificationService.onRenewalApproved(request).catch(() => {})
}

export async function rejectRenewalRequest(requestId: string) {
  const adminId = await requirePermission("RENEWAL_APPROVE")

  const request = await db.renewalRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new Error("Renewal request not found")
  if (request.status !== "SUBMITTED") throw new Error("Can only reject SUBMITTED requests")

  await db.renewalRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" }
  })

  await logAudit(adminId, "RENEWAL_REJECTED", "RenewalRequest", requestId)
  
  revalidatePath('/admin')
  revalidatePath('/admin/renewals')
  notificationService.onRenewalRejected(request).catch(() => {})
}

// --- Inquiries ---
export async function getInquiries() {
  await requirePermission("INQUIRY_VIEW")
  return db.inquiry.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function updateInquiryStatus(id: string, status: string) {
  const adminId = await requirePermission("INQUIRY_MANAGE")
  await db.inquiry.update({ where: { id }, data: { status } })
  await logAudit(adminId, "INQUIRY_STATUS_CHANGED", "Inquiry", id, { status })
  revalidatePath('/admin')
  revalidatePath('/admin/inquiries')
}

// --- Feedback ---
export async function getFeedback() {
  await requirePermission("FEEDBACK_VIEW")
  return db.feedback.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateFeedbackStatus(id: string, status: string) {
  const adminId = await requirePermission("FEEDBACK_MANAGE")
  await db.feedback.update({ where: { id }, data: { status } })
  await logAudit(adminId, "FEEDBACK_STATUS_CHANGED", "Feedback", id, { status })
  revalidatePath('/admin')
  revalidatePath('/admin/feedback')
}

// --- Add-Ons ---
export async function getAddOns() {
  await requirePermission("PLAN_VIEW")
  return db.addOn.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function toggleAddOnStatus(id: string, active: boolean) {
  const adminId = await requirePermission("PLAN_MANAGE")
  await db.addOn.update({ where: { id }, data: { active } })
  await logAudit(adminId, "ADDON_STATUS_CHANGED", "AddOn", id, { active })
  revalidatePath('/admin/add-ons')
}

// --- Care Plan Catalog Governance ---
export async function getAdminCarePlans() {
  await requirePermission("PLAN_VIEW")
  return db.carePlan.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      variants: {
        include: {
          durations: true,
          services: true
        }
      }
    }
  })
}

export async function toggleCarePlanStatus(id: string, active: boolean) {
  const adminId = await requirePermission("PLAN_MANAGE")
  const updated = await db.carePlan.update({ where: { id }, data: { active } })
  await logAudit(adminId, "CARE_PLAN_STATUS_CHANGED", "CarePlan", id, { active })
  revalidatePath('/admin/add-ons')
  return { success: true, active: updated.active }
}


export async function getAuditLogs(params?: { page?: number; pageSize?: number; action?: string; entityType?: string }) {
  await requirePermission("AUDIT_VIEW")
  const page = params?.page || 1
  const pageSize = params?.pageSize || 50
  
  const where = {
    ...(params?.action ? { action: { contains: params.action, mode: 'insensitive' as const } } : {}),
    ...(params?.entityType ? { entityType: { contains: params.entityType, mode: 'insensitive' as const } } : {})
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    db.auditLog.count({ where })
  ])

  return { logs, total, pages: Math.ceil(total / pageSize) }
}

import { adminVerifyPayment, adminRejectPayment } from "@/lib/services/payment"

export async function verifyPayment(paymentId: string) {
  const adminId = await requirePermission("PAYMENT_VERIFY")
  await adminVerifyPayment(paymentId, adminId)
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
}

export async function rejectPayment(paymentId: string, reason: string) {
  const adminId = await requirePermission("PAYMENT_VERIFY")
  await adminRejectPayment(paymentId, adminId, reason)
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
}

import { memberRegistrationSchema } from '@/lib/validations/member'
import bcrypt from 'bcryptjs'
import { ROLES } from '@/lib/auth/roles'

export async function adminCreateMember(formData: FormData) {
  const adminId = await requirePermission('MEMBER_MANAGE')

  const data = Object.fromEntries(formData.entries());
  if (data.shiftAuthorization === 'on' || data.shiftAuthorization === 'true') {
    data.shiftAuthorization = true as any;
  } else {
    data.shiftAuthorization = false as any;
  }
  
  if (data.idProofType === '') delete data.idProofType;
  if (data.idProofNumber === '') delete data.idProofNumber;
  if (data.gender === '') delete data.gender;

  const validationResult = memberRegistrationSchema.safeParse(data)
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.issues[0].message }
  }
  const validatedData = validationResult.data
  const normalizedEmail = validatedData.email.toLowerCase()

  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) return { success: false, error: 'Email already exists' }

  const passwordHash = await bcrypt.hash(validatedData.password, 10)

  const salutation = (validatedData.salutation || "").trim() || "Mr";
  const firstName = validatedData.firstName.trim();
  const lastName = validatedData.lastName.trim();
  const fullName = `${salutation} ${firstName} ${lastName}`.trim();

  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: fullName,
        email: normalizedEmail,
        passwordHash,
        role: ROLES.MEMBER,
        emailVerified: new Date(),
      }
    })

    const hasSpouseData = Boolean(validatedData.spouseFirstName?.trim() || validatedData.spouseLastName?.trim());
    const spouseSalutation = hasSpouseData
      ? ((validatedData.spouseSalutation || "").trim() || "Mr")
      : null;

    const profile = await tx.memberProfile.create({
      data: {
        userId: newUser.id,
        salutation,
        firstName,
        lastName,
        idProofType: validatedData.idProofType || null,
        idProofNumber: validatedData.idProofNumber || null,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        gender: validatedData.gender,
        serviceAddress: validatedData.serviceAddress,
        nearestLandmark: validatedData.nearestLandmark || null,
        mobileNumber: validatedData.mobileNumber,
        alternateNumber: validatedData.alternateNumber || null,
        email: normalizedEmail,
        spouseSalutation,
        spouseFirstName: validatedData.spouseFirstName?.trim() || null,
        spouseLastName: validatedData.spouseLastName?.trim() || null,
      }
    })
    await tx.emergencyContact.create({
      data: { userId: newUser.id, fullName: validatedData.emergencyContactName, relationship: validatedData.emergencyContactRelationship, phone: validatedData.emergencyContactMobile, alternatePhone: validatedData.emergencyContactOther || null, email: validatedData.emergencyContactEmail || null }
    })

    const sponsorFirstName = validatedData.sponsorFirstName?.trim() || (validatedData.sponsorName ? validatedData.sponsorName.trim().split(/\s+/)[0] : "");
    const sponsorLastName = validatedData.sponsorLastName?.trim() || (validatedData.sponsorName ? validatedData.sponsorName.trim().split(/\s+/).slice(1).join(" ") : "");
    const hasSponsorData = Boolean(sponsorFirstName || sponsorLastName || validatedData.sponsorName?.trim() || validatedData.sponsorMobile?.trim());
    const sponsorSalutation = hasSponsorData
      ? ((validatedData.sponsorSalutation || "").trim() || "Mr")
      : "Mr";
    const sponsorFullName = [sponsorSalutation, sponsorFirstName, sponsorLastName].filter(Boolean).join(" ") || validatedData.sponsorName?.trim() || "Sponsor";

    await tx.sponsor.create({
      data: {
        memberProfileId: profile.id,
        salutation: sponsorSalutation,
        firstName: sponsorFirstName || null,
        lastName: sponsorLastName || null,
        fullName: sponsorFullName,
        relationship: validatedData.sponsorRelationship || "Sponsor",
        mobileNumber: validatedData.sponsorMobile || "",
        alternateNumber: validatedData.sponsorOther || null,
        email: validatedData.sponsorEmail || null,
      }
    })
    if (validatedData.insuranceProvider || validatedData.policyNumber) {
      await tx.insuranceDetails.create({ data: { memberProfileId: profile.id, providerName: validatedData.insuranceProvider || '', policyNumber: validatedData.policyNumber || '', coverageAmount: validatedData.coverageAmount || null } })
    }
    await tx.medicalAuthorization.create({
      data: { memberProfileId: profile.id, hospitalForSos: validatedData.hospitalForSos || null, nomineeLocalContact: validatedData.nomineeLocalContact || null, shiftAuthorization: validatedData.shiftAuthorization }
    })
    return newUser
  })

  await logAudit(adminId, 'MEMBER_REGISTERED_BY_ADMIN', 'USER', user.id)
  revalidatePath('/admin/members')
  return { success: true, userId: user.id }
}

