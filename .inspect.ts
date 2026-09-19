import { PrismaClient } from '@prisma/client'; 
const db = new PrismaClient(); 
async function main() { 
  console.log('Subscriptions:', await db.subscription.count()); 
  console.log('Orders:', await db.order.count()); 
  console.log('Plans:', await db.plan.count()); 
  console.log('Users:', await db.user.count());
} 
main().finally(()=>db.$disconnect());
