import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================
// AUTHORITATIVE CARE PLAN CATALOG
// Source of Truth: Sunshine Eldercare Package document
// DO NOT recalculate, correct, or "fix" any value below.
// All amounts are in INR.
// ============================================================

const CARE_PLANS = [
  {
    slug: 'shield-shine',
    name: 'Shield Shine',
    sortOrder: 1,
    variants: [
      {
        variantType: 'SINGLE',
        monthlyBasePrice: 4800,
        monthlyGst: 864,
        monthlyTotal: 5664,
        durations: [
          { months: 1, documentedTotal: 5664, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 16992, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 33984, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 62870, hasDiscount: true, discountNote: 'After 7.5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
          { serviceName: '4 x Out door visit per months (Total 10 Hrs/Month)', serviceNote: null, sortOrder: 5 },
        ],
      },
      {
        variantType: 'COUPLE',
        monthlyBasePrice: 6000,
        monthlyGst: 1080,
        monthlyTotal: 7080,
        durations: [
          { months: 1, documentedTotal: 7080, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 21240, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 42480, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 78588, hasDiscount: true, discountNote: 'After 7.5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
          { serviceName: '4 x Out door visit per months (Total 10 Hrs/Month)', serviceNote: null, sortOrder: 5 },
        ],
      },
    ],
  },
  {
    slug: 'semi-shield-shine',
    name: 'Semi Shield Shine',
    sortOrder: 2,
    variants: [
      {
        variantType: 'SINGLE',
        monthlyBasePrice: 4500,
        monthlyGst: 810,
        monthlyTotal: 5310,
        durations: [
          { months: 1, documentedTotal: 5310, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 15930, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 31860, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 58941, hasDiscount: true, discountNote: 'After 7.5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
          { serviceName: '2 x Out door visit per months (Total 5 Hrs/Month)', serviceNote: null, sortOrder: 5 },
        ],
      },
      {
        variantType: 'COUPLE',
        monthlyBasePrice: 5500,
        monthlyGst: 990,
        monthlyTotal: 6490,
        durations: [
          { months: 1, documentedTotal: 6490, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 19470, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 38940, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 72039, hasDiscount: true, discountNote: 'After 7.5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
          { serviceName: '2 x Out door visit per months (Total 5 Hrs/Month)', serviceNote: null, sortOrder: 5 },
        ],
      },
    ],
  },
  {
    slug: 'life-line-care',
    name: 'Life Line Care',
    sortOrder: 3,
    variants: [
      {
        variantType: 'SINGLE',
        monthlyBasePrice: 2300,
        monthlyGst: 414,
        monthlyTotal: 2714,
        durations: [
          { months: 1, documentedTotal: 2714, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 8142, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 16284, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 30940, hasDiscount: true, discountNote: 'After 5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
        ],
      },
      {
        variantType: 'COUPLE',
        monthlyBasePrice: 3300,
        monthlyGst: 594,
        monthlyTotal: 3894,
        durations: [
          { months: 1, documentedTotal: 3894, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 11682, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 23364, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 44392, hasDiscount: true, discountNote: 'After 5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
        ],
      },
    ],
  },
]

async function main() {
  console.log('Seeding care plan catalog from source document...')

  for (const plan of CARE_PLANS) {
    const carePlan = await prisma.carePlan.upsert({
      where: { slug: plan.slug },
      update: { name: plan.name, sortOrder: plan.sortOrder },
      create: { slug: plan.slug, name: plan.name, sortOrder: plan.sortOrder, active: true },
    })

    for (const variant of plan.variants) {
      const carePlanVariant = await prisma.carePlanVariant.upsert({
        where: { carePlanId_variantType: { carePlanId: carePlan.id, variantType: variant.variantType } },
        update: {
          monthlyBasePrice: variant.monthlyBasePrice,
          monthlyGst: variant.monthlyGst,
          monthlyTotal: variant.monthlyTotal,
        },
        create: {
          carePlanId: carePlan.id,
          variantType: variant.variantType,
          monthlyBasePrice: variant.monthlyBasePrice,
          monthlyGst: variant.monthlyGst,
          monthlyTotal: variant.monthlyTotal,
        },
      })

      // Seed durations (idempotent upsert)
      for (const dur of variant.durations) {
        await prisma.carePlanDuration.upsert({
          where: { variantId_months: { variantId: carePlanVariant.id, months: dur.months } },
          update: {
            documentedTotal: dur.documentedTotal,
            hasDiscount: dur.hasDiscount,
            discountNote: dur.discountNote,
          },
          create: {
            variantId: carePlanVariant.id,
            months: dur.months,
            documentedTotal: dur.documentedTotal,
            hasDiscount: dur.hasDiscount,
            discountNote: dur.discountNote,
          },
        })
      }

      // Seed services: delete and re-insert to maintain sort order idempotently
      await prisma.carePlanService.deleteMany({ where: { variantId: carePlanVariant.id } })
      for (const svc of variant.services) {
        await prisma.carePlanService.create({
          data: {
            variantId: carePlanVariant.id,
            serviceName: svc.serviceName,
            serviceNote: svc.serviceNote,
            sortOrder: svc.sortOrder,
          },
        })
      }
    }

    console.log(`  ✓ ${plan.name} seeded (${plan.variants.length} variants)`)
  }

  // Seed MemberSequence
  await prisma.memberSequence.upsert({
    where: { id: "MEMBER_SEQ" },
    update: {},
    create: { id: "MEMBER_SEQ", current: 1000 },
  })

  // ============================================================
  // RBAC PERMISSIONS AND ROLES
  // ============================================================
  console.log('Seeding RBAC permissions...')
  const { PERMISSIONS } = await import('../lib/auth/permissions')
  
  for (const [key, code] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        description: `Permission to ${key.replace(/_/g, ' ').toLowerCase()}`
      }
    })
  }
  console.log(`  ✓ ${Object.keys(PERMISSIONS).length} permissions seeded`)

  // Seed default System Roles
  console.log('Seeding default system roles...')
  
  const ownerRole = await prisma.role.upsert({
    where: { name: 'Owner' },
    update: { isSystem: true },
    create: { name: 'Owner', description: 'Highest administrative authority', isSystem: true }
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: { isSystem: true },
    create: { name: 'Super Admin', description: 'Operational super administrator', isSystem: true }
  })
  
  const allPermissions = await prisma.permission.findMany()
  
  // Owner gets ALL permissions
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: perm.id }
    })
  }

  // Super Admin gets all permissions EXCEPT ROLE_MANAGE
  for (const perm of allPermissions) {
    if (perm.code === 'ROLE_MANAGE') continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id }
    })
  }
  console.log('  ✓ System roles seeded (Owner, Super Admin)')

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
