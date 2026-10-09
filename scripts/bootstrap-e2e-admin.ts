/**
 * bootstrap-e2e-admin.ts
 *
 * Seeds a deterministic Owner-level admin account for E2E Playwright tests.
 * Must only run against the isolated local E2E database (e2e_db).
 *
 * This user is required by phase3, phase4a, phase5, and phase6 E2E specs that
 * log in as e2e_admin@example.com. It has the Owner role so it passes ROLE_MANAGE
 * and all other admin permission checks in those specs.
 *
 * NEVER run this against a production or staging database.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1') && !dbUrl.includes('e2e_db')) {
    console.error('ABORT: DATABASE_URL does not point to a local/e2e database. Refusing to seed.');
    process.exit(1);
  }

  console.log('Bootstrapping E2E admin account...');

  // Password is intentionally test-only. Never use in production.
  const email = 'e2e_admin@example.com';
  const rawPassword = process.env.E2E_ADMIN_PASSWORD ?? 'password123';

  const ownerRole = await db.role.findUnique({ where: { name: 'Owner' } });
  if (!ownerRole) {
    console.error('Owner role not found - run seed.ts first.');
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    const hasRole = await db.userRole.findUnique({
      where: { userId_roleId: { userId: existing.id, roleId: ownerRole.id } },
    });
    if (hasRole) {
      console.log('E2E admin already exists with Owner role - idempotent, nothing to do.');
      return;
    }
    await db.userRole.create({ data: { userId: existing.id, roleId: ownerRole.id } });
    console.log('Owner role assigned to existing e2e admin.');
    return;
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const user = await db.user.create({
    data: {
      email,
      name: 'E2E Admin',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });

  await db.userRole.create({ data: { userId: user.id, roleId: ownerRole.id } });

  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'E2E_ADMIN_BOOTSTRAPPED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { purpose: 'E2E test fixture - isolated local database only' },
    },
  });

  console.log('E2E admin bootstrapped successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
