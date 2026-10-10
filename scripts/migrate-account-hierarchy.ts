import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to dry-run

async function main() {
  console.log(`Starting account hierarchy migration... DRY_RUN=${DRY_RUN}`);

  try {
    const allUsers = await prisma.user.findMany({
      include: { employee: true, userRoles: { include: { role: true } } }
    });

    console.log(`Total users found: ${allUsers.length}`);

    let memberCount = 0;
    let employeeCount = 0;
    let ownerCount = 0;
    let ownerFound = false;

    // 1. Identify distinct role values
    const distinctRoles = new Set(allUsers.map(u => u.role));
    console.log(`Distinct legacy roles found in database:`, Array.from(distinctRoles));

    for (const user of allUsers) {
      if (user.email === 'info.sunshineeldercare@gmail.com') {
        ownerCount++;
        ownerFound = true;
        
        if (ownerCount > 1) {
          throw new Error(`CRITICAL SECURITY FAULT: Duplicate canonical Owner identity found! Duplicate ID: ${user.id}`);
        }

        console.log(`[OWNER] Found canonical owner: ${user.email} (Current Role: ${user.role})`);
        
        // Owner strictly retains OWNER base role to remain a unique, protected identity.
        // They are NEVER coerced to EMPLOYEE and NEVER given a fabricated Employee record.
        if (!DRY_RUN && user.role !== 'OWNER') {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'OWNER' }});
          console.log(` -> Reclassified to canonical OWNER`);
        } else if (DRY_RUN && user.role !== 'OWNER') {
          console.log(`[DRY RUN] Would reclassify to canonical OWNER`);
        }
        continue;
      }

      if (user.role === 'USER' || user.role === 'MEMBER') {
        memberCount++;
        if (!DRY_RUN && user.role !== 'MEMBER') {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'MEMBER' }});
        }
      } else if (['ADMIN', 'STAFF', 'CAREGIVER', 'COORDINATOR', 'SUPER_ADMIN', 'EMPLOYEE'].includes(user.role)) {
        employeeCount++;
        
        // Convert to EMPLOYEE
        if (!DRY_RUN && user.role !== 'EMPLOYEE') {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'EMPLOYEE' }});
        }
          
        // Generate an Employee record if they don't have one
        if (!DRY_RUN && !user.employee) {
          console.log(`Generating stub Employee record for ${user.email} (Legacy role: ${user.role})`);
          const empSeq = await prisma.employeeSequence.upsert({
            where: { id: 'EMP_SEQ' },
            update: { current: { increment: 1 } },
            create: { current: 100 }
          });
          
          const [firstName, ...lastNameParts] = (user.name || 'Staff User').split(' ');
          const lastName = lastNameParts.join(' ') || 'Unknown';
          
          await prisma.employee.create({
            data: {
              employeeId: `SEC/MIG/${empSeq.current}`,
              firstName,
              lastName,
              designation: user.role, // Use legacy role string as fallback designation
              email: user.email,
              status: user.status,
              user: { connect: { id: user.id } }
            }
          });
        } else if (DRY_RUN && !user.employee) {
          console.log(`[DRY RUN] Would generate stub Employee record for ${user.email} (Legacy role: ${user.role})`);
        }
      } else {
        console.warn(`[WARNING] Unknown role encountered: ${user.role} for user ${user.email}. Skipping.`);
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`Owner found: ${ownerFound}`);
    console.log(`Members identified: ${memberCount}`);
    console.log(`Employees identified: ${employeeCount}`);
    if (DRY_RUN) {
      console.log(`\nThis was a DRY RUN. No changes were saved to the database. Run with DRY_RUN=false to execute.`);
    } else {
      console.log(`\nMigration executed successfully.`);
    }

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
