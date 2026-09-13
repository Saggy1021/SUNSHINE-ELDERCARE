import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================
// AUTHORITATIVE CARE PLAN CATALOG
// Source of Truth: Sunshine Elder Care Package document
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
          // 1-month is a CONFIRMED valid service/purchase option (business owner confirmed).
          // documentedTotal equals the exact documented monthly total from source document.
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
          { serviceName: 'Out door visit', serviceNote: '4 x Out door visit per months (Total 10 Hrs/Month)', sortOrder: 5 },
        ],
      },
      {
        variantType: 'COUPLE',
        monthlyBasePrice: 5600,
        monthlyGst: 1008,
        monthlyTotal: 6608,
        durations: [
          { months: 1, documentedTotal: 6608, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 19824, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 39648, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 73349, hasDiscount: true, discountNote: 'After 7.5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
          { serviceName: 'Out door visit', serviceNote: '4 x Out door visit per months (Total 10 Hrs/Month)', sortOrder: 5 },
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
          { serviceName: 'Out door visit', serviceNote: '2 x Out door visit per months (Total 5 Hrs/Month)', sortOrder: 5 },
        ],
      },
      {
        variantType: 'COUPLE',
        monthlyBasePrice: 5300,
        monthlyGst: 954,
        monthlyTotal: 6254,
        durations: [
          { months: 1, documentedTotal: 6254, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 18762, hasDiscount: false, discountNote: null },
          { months: 6, documentedTotal: 37524, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 69419, hasDiscount: true, discountNote: 'After 7.5% discount' },
        ],
        services: [
          { serviceName: 'Comprehensive Care Service', serviceNote: null, sortOrder: 1 },
          { serviceName: '24/7 Emergency Assistant', serviceNote: null, sortOrder: 2 },
          { serviceName: 'Daily Wellness Calls', serviceNote: null, sortOrder: 3 },
          { serviceName: 'Monthly Senior Staff Visit', serviceNote: null, sortOrder: 4 },
          { serviceName: 'Out door visit', serviceNote: '2 x Out door visit per months (Total 5 Hrs/Month)', sortOrder: 5 },
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
          // CRITICAL: Source document shows "Life Line Care Couple 06 Months" label here but
          // this is the SINGLE variant. Preserving documentedTotal exactly as written: 16284
          { months: 6, documentedTotal: 16284, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 32568, hasDiscount: false, discountNote: null },
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
        monthlyBasePrice: 2750,
        monthlyGst: 495,
        monthlyTotal: 3245,
        durations: [
          { months: 1, documentedTotal: 3245, hasDiscount: false, discountNote: null },
          { months: 3, documentedTotal: 9735, hasDiscount: false, discountNote: null },
          // PRESERVED EXACTLY: Source document states "Life Line Care Couple 06 Months – Rs. 19470/-"
          // This value is the source of truth. It is NOT recalculated, NOT corrected.
          { months: 6, documentedTotal: 19470, hasDiscount: false, discountNote: null },
          { months: 12, documentedTotal: 38940, hasDiscount: false, discountNote: null },
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
