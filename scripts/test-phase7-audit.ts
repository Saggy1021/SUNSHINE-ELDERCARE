// 1. Fail-closed database safety check MUST RUN BEFORE IMPORTS
if (process.env.TEST_OPT_IN !== 'true') {
  console.error('[FATAL] Explicit TEST_OPT_IN=true environment variable is required to run this script.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL is not set.');
  process.exit(1);
}

try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  if (dbUrl.protocol !== 'postgresql:' && dbUrl.protocol !== 'postgres:') {
    console.error('[FATAL] Target database must use postgresql protocol. Opt-in failed.');
    process.exit(1);
  }
  if (dbUrl.hostname !== '127.0.0.1' && dbUrl.hostname !== 'localhost') {
    console.error('[FATAL] Target database host must be localhost or 127.0.0.1. Opt-in failed.');
    process.exit(1);
  }
  if (dbUrl.port && dbUrl.port !== '5432') {
    console.error('[FATAL] Target database port must be exactly 5432 (or default). Opt-in failed.');
    process.exit(1);
  }
  if (dbUrl.pathname !== '/e2e_db') {
    console.error('[FATAL] Target database pathname must be /e2e_db. Opt-in failed.');
    process.exit(1);
  }
  if (dbUrl.search) {
    console.error('[FATAL] Target database URL query parameters are forbidden to prevent connection manipulation. Opt-in failed.');
    process.exit(1);
  }
} catch (e) {
  console.error('[FATAL] Invalid DATABASE_URL format.');
  process.exit(1);
}

// 2. Safe Dynamic Imports
async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { AuthorizationService } = await import('../lib/services/authorization');

  const prisma = new PrismaClient();

  async function runTests() {
    console.log('--- Phase 7 Audit Log Tests ---');
    let testAuditLog: any = null;
    let superAdmin: any = null;
  let owner: any = null;
    let hasFailures = false;

    try {
      const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });
      const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });

            owner = await prisma.user.findFirst({ where: { userRoles: { some: { roleId: ownerRole!.id } } } });
      if (!owner) {
        owner = await prisma.user.create({
          data: {
            email: 'test_owner_' + Date.now() + '@example.com',
            name: 'Test Owner',
            role: 'ADMIN',
            status: 'ACTIVE',
            passwordHash: 'dummy',
            userRoles: { create: { roleId: ownerRole!.id } }
          }
        });
      }

      superAdmin = await prisma.user.create({
        data: {
          email: 'test_superadmin_' + Date.now() + '@example.com',
          name: 'Test SuperAdmin',
          role: 'ADMIN',
          status: 'ACTIVE',
          passwordHash: 'dummy',
          userRoles: { create: { roleId: superAdminRole!.id } }
        }
      });

      // 1. Authorization tests
      try {
        await AuthorizationService.require(owner.id, 'AUDIT_VIEW');
        console.log('[PASS] Owner can access audit logs');
      } catch (e) {
        console.error('[FAIL] Owner cannot access audit logs');
        hasFailures = true;
      }

      try {
        await AuthorizationService.require(superAdmin.id, 'AUDIT_VIEW');
        console.error('[FAIL] Super Admin incorrectly gained access to audit logs');
        hasFailures = true;
      } catch (e: any) {
        if (e.message && e.message.includes('permission')) {
          console.log('[PASS] Super Admin is denied access to audit logs');
        } else {
          console.error('[FAIL] Super Admin access denied due to UNEXPECTED error:', e.message);
          hasFailures = true;
        }
      }

      // 2. Redaction tests
      const { db } = await import('../lib/db');

      // Check redaction via the Prisma middleware injected into db.ts
      testAuditLog = await db.auditLog.create({
        data: {
          actorUserId: owner.id,
          action: 'REDACTION_TEST',
          entityType: 'USER',
          entityId: owner.id,
          metadata: {
            password: 'supersecret',
            safeField: 'hello',
            api_key: 'sk_live_123',
            apiKey: 'sk_test_123',
            stripeKey: 'sk_123',
            razorpay_signature: 'sig_123',
            access_token: 'acc_123',
            authorizationHeader: 'Bearer 123',
            credentials: { passwordHash: 'hash123', NestedSafe: 'safe' },
            Status: 'ACTIVE',
            keyboard: 'mechanical'
          }
        }
      });

      const redactedLog = await prisma.auditLog.findUnique({
        where: { id: testAuditLog.id }
      });

      if (!redactedLog || !redactedLog.metadata) {
        console.error('[FAIL] Audit log not found or metadata missing.');
        hasFailures = true;
        return;
      }

      const meta = redactedLog.metadata as any;

            // Assert safe fields are preserved
      const safeCheck = meta.safeField === 'hello' && meta.credentials?.NestedSafe === 'safe' && meta.keyboard === 'mechanical' && meta.Status === 'ACTIVE';
      if (!safeCheck) {
        console.error('[FAIL] Safe fields were incorrectly redacted. Keys present:', Object.keys(meta));
        hasFailures = true;
      } else {
        console.log('[PASS] Safe audit metadata fields are successfully preserved.');
      }

      // Assert sensitive fields are redacted
      const allRedacted = meta.password === '[REDACTED]' &&
                          meta.api_key === '[REDACTED]' &&
                          meta.apiKey === '[REDACTED]' &&
                          meta.stripeKey === '[REDACTED]' &&
                          meta.razorpay_signature === '[REDACTED]' &&
                          meta.access_token === '[REDACTED]' &&
                          meta.authorizationHeader === '[REDACTED]' &&
                          meta.credentials?.passwordHash === '[REDACTED]';

      if (allRedacted) {
        console.log('[PASS] Sensitive audit metadata variations are successfully redacted before persistence.');
      } else {
        console.error('[FAIL] Sensitive audit metadata was NOT completely redacted! Keys present:', Object.keys(meta));
        hasFailures = true;
      }
    } catch (e: any) {
      console.error('[FAIL] Unexpected error during test execution:', e.message);
      hasFailures = true;
    } finally {
      // Guaranteed Teardown
      console.log('Cleaning up test data...');
      try {
        if (testAuditLog) {
          await prisma.auditLog.delete({ where: { id: testAuditLog.id } });
        }
        if (superAdmin) {
          await prisma.userRole.deleteMany({ where: { userId: superAdmin.id } });
          await prisma.user.delete({ where: { id: superAdmin.id } });
        }
        if (owner && owner.email.startsWith('test_owner_')) {
          await prisma.userRole.deleteMany({ where: { userId: owner.id } });
          await prisma.user.delete({ where: { id: owner.id } });
        }
      } catch (cleanupError) {
        console.error('[FAIL] Cleanup failed:', cleanupError);
        process.exitCode = 1;
      }

      if (hasFailures) {
        process.exitCode = 1;
      }
    }
  }

  await runTests().finally(() => prisma.$disconnect());
}

// @ts-ignore
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
