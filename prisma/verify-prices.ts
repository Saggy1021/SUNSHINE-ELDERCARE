/**
 * Phase 4 — COMPREHENSIVE Care Plan Pricing Verification
 * Source of Truth: Sunshine Eldercare Package document
 * Business owner confirmed: 1-month is a valid service/purchase option.
 *
 * Run: npx tsx prisma/verify-prices.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

let passed = 0
let failed = 0

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${label}`)
    passed++
  } else {
    console.error(`  FAIL: ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

// ── Exact price matrix from source document ──────────────────────────────────
// Business owner confirmed: 1-month = valid service option = documented monthly total.
const PRICE_MATRIX: Array<{
  plan: string
  variant: 'SINGLE' | 'COUPLE'
  months: number
  expectedTotal: number
  hasDiscount?: boolean
  discountNote?: string
}> = [
  // Shield Shine — Single
  { plan: 'shield-shine', variant: 'SINGLE', months: 1,  expectedTotal: 5664 },
  { plan: 'shield-shine', variant: 'SINGLE', months: 3,  expectedTotal: 16992 },
  { plan: 'shield-shine', variant: 'SINGLE', months: 6,  expectedTotal: 33984 },
  { plan: 'shield-shine', variant: 'SINGLE', months: 12, expectedTotal: 62870, hasDiscount: true, discountNote: 'After 7.5% discount' },
  // Shield Shine — Couple
  { plan: 'shield-shine', variant: 'COUPLE', months: 1,  expectedTotal: 7080 },
  { plan: 'shield-shine', variant: 'COUPLE', months: 3,  expectedTotal: 21240 },
  { plan: 'shield-shine', variant: 'COUPLE', months: 6,  expectedTotal: 42480 },
  { plan: 'shield-shine', variant: 'COUPLE', months: 12, expectedTotal: 78588, hasDiscount: true, discountNote: 'After 7.5% discount' },
  // Semi Shield Shine — Single
  { plan: 'semi-shield-shine', variant: 'SINGLE', months: 1,  expectedTotal: 5310 },
  { plan: 'semi-shield-shine', variant: 'SINGLE', months: 3,  expectedTotal: 15930 },
  { plan: 'semi-shield-shine', variant: 'SINGLE', months: 6,  expectedTotal: 31860 },
  { plan: 'semi-shield-shine', variant: 'SINGLE', months: 12, expectedTotal: 58941, hasDiscount: true, discountNote: 'After 7.5% discount' },
  // Semi Shield Shine — Couple
  { plan: 'semi-shield-shine', variant: 'COUPLE', months: 1,  expectedTotal: 6490 },
  { plan: 'semi-shield-shine', variant: 'COUPLE', months: 3,  expectedTotal: 19470 },
  { plan: 'semi-shield-shine', variant: 'COUPLE', months: 6,  expectedTotal: 38940 },
  { plan: 'semi-shield-shine', variant: 'COUPLE', months: 12, expectedTotal: 72039, hasDiscount: true, discountNote: 'After 7.5% discount' },
  // Life Line Care — Single
  { plan: 'life-line-care', variant: 'SINGLE', months: 1,  expectedTotal: 2714 },
  { plan: 'life-line-care', variant: 'SINGLE', months: 3,  expectedTotal: 8142 },
  { plan: 'life-line-care', variant: 'SINGLE', months: 6,  expectedTotal: 16284 },
  { plan: 'life-line-care', variant: 'SINGLE', months: 12, expectedTotal: 30940, hasDiscount: true, discountNote: 'After 5% discount' },
  // Life Line Care — Couple
  { plan: 'life-line-care', variant: 'COUPLE', months: 1,  expectedTotal: 3894 },
  { plan: 'life-line-care', variant: 'COUPLE', months: 3,  expectedTotal: 11682 },
  { plan: 'life-line-care', variant: 'COUPLE', months: 6,  expectedTotal: 23364 }, 
  { plan: 'life-line-care', variant: 'COUPLE', months: 12, expectedTotal: 44392, hasDiscount: true, discountNote: 'After 5% discount' },
]

// ── Monthly base/GST matrix ──────────────────────────────────────────────────
const MONTHLY_MATRIX = [
  { plan: 'shield-shine',      variant: 'SINGLE', base: 4800, gst: 864,  total: 5664 },
  { plan: 'shield-shine',      variant: 'COUPLE', base: 6000, gst: 1080, total: 7080 },
  { plan: 'semi-shield-shine', variant: 'SINGLE', base: 4500, gst: 810,  total: 5310 },
  { plan: 'semi-shield-shine', variant: 'COUPLE', base: 5500, gst: 990,  total: 6490 },
  { plan: 'life-line-care',    variant: 'SINGLE', base: 2300, gst: 414,  total: 2714 },
  { plan: 'life-line-care',    variant: 'COUPLE', base: 3300, gst: 594,  total: 3894 },
]

// ── Services matrix ──────────────────────────────────────────────────────────
const SERVICES_MATRIX: Record<string, { name: string; note: string | null }[]> = {
  'shield-shine': [
    { name: 'Comprehensive Care Service', note: null },
    { name: '24/7 Emergency Assistant', note: null },
    { name: 'Daily Wellness Calls', note: null },
    { name: 'Monthly Senior Staff Visit', note: null },
    { name: '4 x Out door visit per months (Total 10 Hrs/Month)', note: null },
  ],
  'semi-shield-shine': [
    { name: 'Comprehensive Care Service', note: null },
    { name: '24/7 Emergency Assistant', note: null },
    { name: 'Daily Wellness Calls', note: null },
    { name: 'Monthly Senior Staff Visit', note: null },
    { name: '2 x Out door visit per months (Total 5 Hrs/Month)', note: null },
  ],
  'life-line-care': [
    { name: 'Comprehensive Care Service', note: null },
    { name: '24/7 Emergency Assistant', note: null },
    { name: 'Daily Wellness Calls', note: null },
    { name: 'Monthly Senior Staff Visit', note: null },
  ],
}

async function main() {
  console.log('=== Phase 4 — Comprehensive Care Plan Pricing Verification ===\n')

  // ── 1. Catalog structure ───────────────────────────────────────────────────
  console.log('[ 1. Catalog Structure ]')
  const plans = await prisma.carePlan.findMany({ include: { variants: { include: { durations: true, services: true } } } })
  assert(plans.length === 3, '3 CarePlans exist', `Found: ${plans.length}`)

  const totalVariants = plans.flatMap(p => p.variants).length
  assert(totalVariants === 6, '6 CarePlanVariants exist', `Found: ${totalVariants}`)

  const totalDurations = plans.flatMap(p => p.variants.flatMap(v => v.durations)).length
  assert(totalDurations === 24, '24 CarePlanDuration records exist', `Found: ${totalDurations}`)

  for (const plan of ['shield-shine', 'semi-shield-shine', 'life-line-care']) {
    const p = plans.find(x => x.slug === plan)
    assert(!!p, `CarePlan '${plan}' exists`)
    assert(p?.active === true, `CarePlan '${plan}' is active`)
    assert(p?.variants.some(v => v.variantType === 'SINGLE') ?? false, `${plan} has SINGLE variant`)
    assert(p?.variants.some(v => v.variantType === 'COUPLE') ?? false, `${plan} has COUPLE variant`)
  }

  // ── 2. Monthly base/GST values ─────────────────────────────────────────────
  console.log('\n[ 2. Monthly Base Price, GST & Total ]')
  for (const m of MONTHLY_MATRIX) {
    const v = plans.find(p => p.slug === m.plan)?.variants.find(v => v.variantType === m.variant)
    const label = `${m.plan}/${m.variant}`
    assert(v?.monthlyBasePrice === m.base, `${label} base = ₹${m.base}`, `Got: ${v?.monthlyBasePrice}`)
    assert(v?.monthlyGst === m.gst, `${label} GST = ₹${m.gst}`, `Got: ${v?.monthlyGst}`)
    assert(v?.monthlyTotal === m.total, `${label} monthlyTotal = ₹${m.total}`, `Got: ${v?.monthlyTotal}`)
  }

  // ── 3. All 24 duration prices ─────────────────────────────────────────────
  console.log('\n[ 3. All 24 Documented Prices ]')
  for (const tc of PRICE_MATRIX) {
    const record = await prisma.carePlanDuration.findFirst({
      where: {
        months: tc.months,
        variant: { variantType: tc.variant, carePlan: { slug: tc.plan } }
      }
    })
    const label = `${tc.plan}/${tc.variant}/${tc.months}mo`
    if (!record) {
      console.error(`  FAIL: ${label} — NOT FOUND`)
      failed++
    } else {
      assert(record.documentedTotal === tc.expectedTotal,
        `${label} = ₹${tc.expectedTotal}`,
        `Got: ${record.documentedTotal}`)
      if (tc.hasDiscount !== undefined) {
        assert(record.hasDiscount === tc.hasDiscount, `${label} hasDiscount=${tc.hasDiscount}`)
      }
      if (tc.discountNote !== undefined) {
        assert(record.discountNote === tc.discountNote, `${label} discountNote="${tc.discountNote}"`,
          `Got: "${record.discountNote}"`)
      }
    }
  }

  // ── 4. Discount notes for 12-month plans and Life Line Care  ─────────────────────────────
  console.log('\n[ 4. Discount Notes ]')
  const discountedPlans = ['shield-shine', 'semi-shield-shine']
  for (const slug of discountedPlans) {
    for (const vt of ['SINGLE', 'COUPLE']) {
      const r = await prisma.carePlanDuration.findFirst({
        where: { months: 12, variant: { variantType: vt, carePlan: { slug } } }
      })
      assert(r?.hasDiscount === true, `${slug}/${vt}/12mo hasDiscount=true`)
      assert(r?.discountNote === 'After 7.5% discount', `${slug}/${vt}/12mo discountNote correct`)
    }
  }
  for (const vt of ['SINGLE', 'COUPLE']) {
    const r = await prisma.carePlanDuration.findFirst({
      where: { months: 12, variant: { variantType: vt, carePlan: { slug: 'life-line-care' } } }
    })
    assert(r?.hasDiscount === true, `life-line-care/${vt}/12mo hasDiscount=true`)
    assert(r?.discountNote === 'After 5% discount', `life-line-care/${vt}/12mo discountNote correct`)
  }

  // ── 5. Services ───────────────────────────────────────────────────────────
  console.log('\n[ 5. Services ]')
  for (const [planSlug, expectedSvcs] of Object.entries(SERVICES_MATRIX)) {
    const plan = plans.find(p => p.slug === planSlug)
    const variant = plan?.variants.find(v => v.variantType === 'SINGLE')
    const services = variant?.services ?? []
    assert(services.length === expectedSvcs.length,
      `${planSlug} has ${expectedSvcs.length} services`, `Got: ${services.length}`)
    for (const expected of expectedSvcs) {
      const found = services.find(s => s.serviceName === expected.name)
      assert(!!found, `${planSlug}: service "${expected.name}" exists`)
      if (expected.note !== null) {
        assert(found?.serviceNote === expected.note,
          `${planSlug}: service note preserved exactly`,
          `Expected: "${expected.note}" | Got: "${found?.serviceNote}"`)
      }
    }
  }
  // Life Line Care must NOT have outdoor visits
  const llcSingle = plans.find(p => p.slug === 'life-line-care')?.variants.find(v => v.variantType === 'SINGLE')
  const hasOutdoor = llcSingle?.services.some(s => s.serviceName.toLowerCase().includes('door'))
  assert(!hasOutdoor, 'Life Line Care does NOT include outdoor visit service')

  // ── 6. Uniqueness constraints ─────────────────────────────────────────────
  console.log('\n[ 6. Database Uniqueness ]')
  for (const slug of ['shield-shine', 'semi-shield-shine', 'life-line-care']) {
    const count = await prisma.carePlan.count({ where: { slug } })
    assert(count === 1, `Only 1 CarePlan with slug '${slug}'`, `Found: ${count}`)
  }
  for (const slug of ['shield-shine', 'semi-shield-shine', 'life-line-care']) {
    for (const vt of ['SINGLE', 'COUPLE']) {
      const count = await prisma.carePlanVariant.count({
        where: { variantType: vt, carePlan: { slug } }
      })
      assert(count === 1, `Only 1 variant ${slug}/${vt}`, `Found: ${count}`)
    }
  }

  // ── 7. Invalid request simulation ─────────────────────────────────────────
  console.log('\n[ 7. Invalid Request Handling ]')
  const invalidPlan = await prisma.carePlan.findFirst({ where: { slug: 'non-existent-plan' } })
  assert(invalidPlan === null, 'Invalid plan slug returns null (not found)')

  const invalidVariant = await prisma.carePlanVariant.findFirst({
    where: { variantType: 'FAMILY', carePlan: { slug: 'shield-shine' } }
  })
  assert(invalidVariant === null, 'Invalid variant type (FAMILY) returns null')

  const invalidDuration = await prisma.carePlanDuration.findFirst({
    where: { months: 24, variant: { carePlan: { slug: 'shield-shine' } } }
  })
  assert(invalidDuration === null, 'Unsupported duration (24mo) returns null')

  // ── 8. No add-ons seeded ──────────────────────────────────────────────────
  console.log('\n[ 8. Add-Ons (Placeholders) ]')
  const addOnCount = await prisma.addOn.count()
  assert(addOnCount === 3, '3 Placeholder add-ons exist')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(60))
  if (failed > 0) process.exit(1)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
