import { db } from '../lib/db'
import { invoiceService } from '../lib/services/invoice'
import { carePricingService } from '../lib/services/care-plans'
import { taxService } from '../lib/services/tax'

async function runTest() {
  const user = await db.user.findFirst()
  if (!user) {
    console.log('No user found.')
    return
  }

  // 1. Prepare data
  const pricingResult = await carePricingService.lookupPrice({
    planSlug: 'shield-shine',
    variantType: 'SINGLE',
    months: 1
  })
  
  const taxResult = await taxService.calculateCarePlanTax(pricingResult)

  const idempotencyKey = crypto.randomUUID()
  console.log(`Using Idempotency Key: ${idempotencyKey}`)

  // 2. Fire 5 concurrent requests with the SAME idempotency key
  console.log('Firing 5 concurrent requests...')
  const promises = []
  for (let i = 0; i < 5; i++) {
    promises.push(
      invoiceService.createCarePlanInvoice(
        user.id,
        pricingResult,
        taxResult,
        idempotencyKey
      ).then(inv => inv.id).catch(err => err.message)
    )
  }

  const results = await Promise.all(promises)
  console.log('Concurrent Results (Invoice IDs or Errors):', results)

  // 3. Verify exactly one invoice was created
  const uniqueIds = [...new Set(results.filter(id => !id.includes('Failed') && !id.includes('Unique')))]
  console.log(`Unique Invoice IDs generated: ${uniqueIds.length}`)
  
  if (uniqueIds.length === 1) {
    console.log('✅ Concurrency test PASSED. Exactly 1 invoice generated despite 5 simultaneous requests.')
  } else {
    console.log('❌ Concurrency test FAILED. Generated multiple or zero invoices:', uniqueIds)
  }
}

runTest().catch(console.error).finally(() => process.exit(0))
