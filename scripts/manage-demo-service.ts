import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEMO_SERVICE_CONFIG = {
  slug: 'internal-razorpay-demo',
  name: 'Internal Razorpay Demo Service',
  sortOrder: 999,
  variants: [
    {
      variantType: 'SINGLE',
      monthlyBasePrice: 20,
      monthlyGst: 0,
      monthlyTotal: 20,
      durations: [
        {
          months: 1,
          documentedTotal: 20,
          hasDiscount: false,
          discountNote: 'Live Razorpay Test Service (₹20)',
        },
      ],
      services: [
        {
          serviceName: 'Controlled Production Gateway Validation',
          serviceNote: '₹20 internal test transaction',
          sortOrder: 1,
        },
      ],
    },
  ],
};

export async function createDemoService(prismaClient: any = prisma) {
  console.log(`[DemoService] Creating/Updating "${DEMO_SERVICE_CONFIG.name}" (₹20)...`);

  const carePlan = await prismaClient.carePlan.upsert({
    where: { slug: DEMO_SERVICE_CONFIG.slug },
    update: {
      name: DEMO_SERVICE_CONFIG.name,
      sortOrder: DEMO_SERVICE_CONFIG.sortOrder,
      active: true,
    },
    create: {
      slug: DEMO_SERVICE_CONFIG.slug,
      name: DEMO_SERVICE_CONFIG.name,
      sortOrder: DEMO_SERVICE_CONFIG.sortOrder,
      active: true,
    },
  });

  for (const variant of DEMO_SERVICE_CONFIG.variants) {
    const carePlanVariant = await prismaClient.carePlanVariant.upsert({
      where: {
        carePlanId_variantType: {
          carePlanId: carePlan.id,
          variantType: variant.variantType,
        },
      },
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
    });

    for (const dur of variant.durations) {
      await prismaClient.carePlanDuration.upsert({
        where: {
          variantId_months: {
            variantId: carePlanVariant.id,
            months: dur.months,
          },
        },
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
      });
    }

    await prismaClient.carePlanService.deleteMany({
      where: { variantId: carePlanVariant.id },
    });

    for (const svc of variant.services) {
      await prismaClient.carePlanService.create({
        data: {
          variantId: carePlanVariant.id,
          serviceName: svc.serviceName,
          serviceNote: svc.serviceNote,
          sortOrder: svc.sortOrder,
        },
      });
    }
  }

  console.log(`[DemoService] ✓ "${DEMO_SERVICE_CONFIG.name}" successfully provisioned with price ₹20.00.`);
  return carePlan;
}

export async function disableDemoService(prismaClient: any = prisma) {
  console.log(`[DemoService] Disabling "${DEMO_SERVICE_CONFIG.slug}"...`);
  const updated = await prismaClient.carePlan.updateMany({
    where: { slug: DEMO_SERVICE_CONFIG.slug },
    data: { active: false },
  });
  console.log(`[DemoService] ✓ Set active = false (${updated.count} record(s) updated).`);
  return updated;
}

export async function removeDemoService(prismaClient: any = prisma) {
  console.log(`[DemoService] Deleting "${DEMO_SERVICE_CONFIG.slug}"...`);
  const plan = await prismaClient.carePlan.findUnique({
    where: { slug: DEMO_SERVICE_CONFIG.slug },
  });
  if (!plan) {
    console.log(`[DemoService] Service does not exist. Nothing to remove.`);
    return;
  }
  await prismaClient.carePlan.delete({
    where: { slug: DEMO_SERVICE_CONFIG.slug },
  });
  console.log(`[DemoService] ✓ Successfully deleted "${DEMO_SERVICE_CONFIG.slug}" and associated variants.`);
}

export async function getDemoServiceStatus(prismaClient: any = prisma) {
  const plan = await prismaClient.carePlan.findUnique({
    where: { slug: DEMO_SERVICE_CONFIG.slug },
    include: {
      variants: {
        include: {
          durations: true,
          services: true,
        },
      },
    },
  });

  if (!plan) {
    console.log(`[DemoService] Status: NOT_PROVISIONED (Service "${DEMO_SERVICE_CONFIG.slug}" does not exist in DB).`);
    return null;
  }

  console.log(`[DemoService] Status Summary:`);
  console.log(`  - Name: ${plan.name}`);
  console.log(`  - Slug: ${plan.slug}`);
  console.log(`  - Active: ${plan.active ? 'YES (Available for authorized testing)' : 'NO (Disabled)'}`);
  console.log(`  - Base Price: ₹${plan.variants[0]?.monthlyBasePrice}`);
  console.log(`  - Total (1 Month): ₹${plan.variants[0]?.durations[0]?.documentedTotal}`);
  return plan;
}

async function main() {
  const action = process.argv[2] || '--create';

  switch (action) {
    case '--disable':
      await disableDemoService();
      break;
    case '--remove':
      await removeDemoService();
      break;
    case '--status':
      await getDemoServiceStatus();
      break;
    case '--create':
    default:
      await createDemoService();
      await getDemoServiceStatus();
      break;
  }
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[DemoService] Error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

