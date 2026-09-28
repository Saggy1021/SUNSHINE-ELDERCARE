import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Bootstrapping OWNER account...');

  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;

  if (!email || !password) {
    console.error('Error: OWNER_EMAIL and OWNER_PASSWORD must be provided as environment variables.');
    process.exit(1);
  }

  // Find the Owner role
  const ownerRole = await prisma.role.findUnique({
    where: { name: 'Owner' },
  });

  if (!ownerRole) {
    console.error('Error: Owner role does not exist in the database. Run migrations and seed first.');
    process.exit(1);
  }

  // Check if owner user already exists
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // Check if they have the Owner role
    const hasRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: ownerRole.id,
        },
      },
    });

    if (!hasRole) {
      console.error('Error: Account with OWNER_EMAIL already exists but is not an Owner.');
      console.error('Manual intervention is required to prevent privilege escalation.');
      process.exit(1);
    } else {
      console.log('Owner already exists. Bootstrap is idempotent.');
      return;
    }
  } else {
    // Create new user
    console.log('Creating new OWNER user...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    user = await prisma.user.create({
      data: {
        email,
        name: 'Owner',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: ownerRole.id,
      },
    });

    console.log('OWNER user created successfully.');
  }

  // Audit the operation
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id, // Using owner themselves as actor
      action: 'OWNER_BOOTSTRAPPED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { roleAssigned: 'Owner', status: user.status },
    },
  });

  console.log('Audit log created.');
  console.log('Bootstrap complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
