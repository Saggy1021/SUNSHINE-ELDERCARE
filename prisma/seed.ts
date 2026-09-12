import { PrismaClient } from '@prisma/client'
import { businessData } from '../lib/config/business-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with pricing data from config...')

  for (const plan of businessData.pricing) {
    await prisma.plan.upsert({
      where: { slug: plan.id },
      update: {
        name: plan.name,
        price: plan.price,
        description: plan.features.join(', '),
      },
      create: {
        slug: plan.id,
        name: plan.name,
        price: plan.price,
        description: plan.features.join(', '),
        billingType: 'RECURRING',
        billingInterval: 'ANNUAL',
        taxClassification: 'STANDARD_GST',
        active: true,
      },
    })
  }

  // Create a default test tax rule so developers can test it safely
  await prisma.taxRule.upsert({
    where: { taxCode: 'DEV_TEST_GST_18' },
    update: {},
    create: {
      taxCode: 'DEV_TEST_GST_18',
      taxName: 'Development Test GST 18%',
      rate: 18.0,
      taxType: 'GST',
      applicability: 'ALL',
      active: true,
    }
  })

  // Note: We DO NOT seed an active production 18% rule. 
  // In a real environment, administrators must configure exact production tax rules.

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
