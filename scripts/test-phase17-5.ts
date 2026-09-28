import { PrismaClient } from '@prisma/client';
import { AdminUserService } from '../lib/services/admin-users';
import { RoleService } from '../lib/services/roles';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Phase 17.5 Verification Tests ---');

  // Find Owner
  const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });
  let owner = await prisma.user.findFirst({
    where: { userRoles: { some: { roleId: ownerRole!.id } } }
  });

  if (!owner) {
    console.error('Owner not found! Please run bootstrap-owner.ts first.');
    process.exit(1);
  }
  console.log(`[PASS] Owner account exists: ${owner.email}`);

  // Create standard admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'test_admin_' + Date.now() + '@example.com',
      name: 'Test Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: 'dummy'
    }
  });

  console.log(`[PASS] Standard admin user created for testing: ${adminUser.email}`);

  try {
    await RoleService.createRole(adminUser.id, 'Hacker Role', 'Testing IDOR', []);
    console.error('[FAIL] Standard admin could create a role!');
  } catch (e: any) {
    console.log(`[PASS] IDOR Protection: Standard admin blocked from creating role. (${e.message})`);
  }

  try {
    await AdminUserService.createAdminUser(adminUser.id, 'hacker@example.com', 'Hacker', 'password', null, []);
    console.error('[FAIL] Standard admin could create an admin user!');
  } catch (e: any) {
    console.log(`[PASS] IDOR Protection: Standard admin blocked from creating admin user. (${e.message})`);
  }

  // Owner creating a role
  let newRole;
  try {
    const p1 = await prisma.permission.findFirst();
    newRole = await RoleService.createRole(owner.id, 'Test Role ' + Date.now(), 'Desc', [p1!.code]);
    console.log(`[PASS] Owner successfully created a role.`);
  } catch (e: any) {
    console.error('[FAIL] Owner failed to create role:', e);
  }

  // Owner creating an admin
  let newAdmin;
  try {
    newAdmin = await AdminUserService.createAdminUser(
      owner.id, 
      'new_admin_' + Date.now() + '@example.com', 
      'New Admin', 
      'pass', 
      null, 
      [newRole!.id]
    );
    console.log(`[PASS] Owner successfully created an admin user.`);
  } catch (e: any) {
    console.error('[FAIL] Owner failed to create admin user:', e);
  }

  // Last owner protection
  try {
    await AdminUserService.setAdminStatus(owner.id, owner.id, 'INACTIVE');
    console.error('[FAIL] Last owner was able to deactivate themselves!');
  } catch (e: any) {
    console.log(`[PASS] Last Owner Protection: Blocked deactivation. (${e.message})`);
  }

  try {
    await AdminUserService.updateAdminUser(owner.id, owner.id, [newRole!.id], null);
    console.error('[FAIL] Last owner was able to remove their owner role!');
  } catch (e: any) {
    console.log(`[PASS] Last Owner Protection: Blocked removing owner role. (${e.message})`);
  }

  console.log('\nAll tests completed.');
  await prisma.$disconnect();
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
