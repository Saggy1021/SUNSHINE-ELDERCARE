import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const addons = [
    { name: 'Care Visit Plus', price: 0 },
    { name: 'Doctor Consultation', price: 0 },
    { name: 'Wellness Support', price: 0 }
  ];
  for (const a of addons) {
    const exists = await db.addOn.findFirst({ where: { name: a.name } });
    if (!exists) {
      await db.addOn.create({ data: { name: a.name, price: a.price, pricingType: 'RECURRING' } });
      console.log('Created AddOn:', a.name);
    } else {
      console.log('AddOn exists:', a.name);
    }
  }
}
main().finally(() => db.$disconnect());
