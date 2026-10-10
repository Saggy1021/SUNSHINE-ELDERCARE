import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding synthetic test database...');

  // Helper to create synthetic users
  const createUser = async (email: string, role: string, createProfile = false, createEmployee = false) => {
    return prisma.user.create({
      data: {
        email,
        name: `Test ${role}`,
        role,
        status: 'ACTIVE',
        passwordHash: 'dummy_hash',
        ...(createProfile && {
          memberProfile: {
            create: {
              firstName: 'Test',
              lastName: role,
            }
          }
        }),
        ...(createEmployee && {
          employee: {
            create: {
              employeeId: `EMP_${role}_${Date.now()}`,
              firstName: 'Test',
              lastName: role,
              designation: role,
              email,
              status: 'ACTIVE',
            }
          }
        })
      }
    });
  };

  // 1. Canonical Owner
  await createUser('info.sunshineeldercare@gmail.com', 'ADMIN');

  // 2. Legacy ADMIN
  await createUser('legacy_admin@test.com', 'ADMIN');

  // 3. Legacy SUPER_ADMIN
  await createUser('legacy_super@test.com', 'SUPER_ADMIN');

  // 4. Legacy STAFF
  await createUser('legacy_staff@test.com', 'STAFF');

  // 5. Legacy CAREGIVER
  await createUser('legacy_caregiver@test.com', 'CAREGIVER');

  // 6. Legacy COORDINATOR
  await createUser('legacy_coordinator@test.com', 'COORDINATOR');

  // 7. Legacy USER with MemberProfile
  await createUser('legacy_user@test.com', 'USER', true, false);

  // 8. Existing canonical EMPLOYEE with Employee record
  await createUser('canon_employee@test.com', 'EMPLOYEE', false, true);

  // 9. Existing canonical MEMBER with MemberProfile
  await createUser('canon_member@test.com', 'MEMBER', true, false);

  // 10. Unknown legacy role
  await createUser('unknown_role@test.com', 'GUEST_UNKNOWN_ROLE');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
