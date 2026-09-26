import { db } from "../lib/db";
import { EmployeeIdentityService } from "../lib/services/employee-identity";
import { AuthorizationService } from "../lib/services/authorization";

async function runTests() {
  console.log("Starting Phase 13 Employee & RBAC Verification...\n");

  try {
    // 1. Setup RBAC Seed Data
    console.log("Testing RBAC setup...");
    const permView = await db.permission.upsert({
      where: { code: 'EMPLOYEE_VIEW' },
      create: { code: 'EMPLOYEE_VIEW' },
      update: {}
    });
    const permCreate = await db.permission.upsert({
      where: { code: 'EMPLOYEE_CREATE' },
      create: { code: 'EMPLOYEE_CREATE' },
      update: {}
    });

    const role = await db.role.upsert({
      where: { name: 'HR Manager' },
      create: { name: 'HR Manager' },
      update: {}
    });

    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permView.id } },
      create: { roleId: role.id, permissionId: permView.id },
      update: {}
    });
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permCreate.id } },
      create: { roleId: role.id, permissionId: permCreate.id },
      update: {}
    });

    const testUser = await db.user.upsert({
      where: { email: 'hr@example.com' },
      create: { email: 'hr@example.com', name: 'HR User' },
      update: {}
    });

    await db.userRole.upsert({
      where: { userId_roleId: { userId: testUser.id, roleId: role.id } },
      create: { userId: testUser.id, roleId: role.id },
      update: {}
    });

    // Verify Authorization
    const canView = await AuthorizationService.can(testUser.id, 'EMPLOYEE_VIEW');
    const canCreate = await AuthorizationService.can(testUser.id, 'EMPLOYEE_CREATE');
    const canDelete = await AuthorizationService.can(testUser.id, 'EMPLOYEE_DEACTIVATE');
    
    if (!canView || !canCreate || canDelete) {
      throw new Error("RBAC Authorization logic failed");
    }
    console.log("✅ RBAC check passed.");

    // 2. Test Employee ID Generation
    console.log("Testing Employee ID generation...");
    const empId1 = await EmployeeIdentityService.generateEmployeeId("Sagnik", "Kar");
    const empId2 = await EmployeeIdentityService.generateEmployeeId("John", "Doe");
    
    // Test formatting SEC/101/SAKA
    if (!empId1.startsWith("SEC/") || !empId1.endsWith("/SAKA")) {
      throw new Error(`Invalid employee ID format for Sagnik Kar: ${empId1}`);
    }
    if (!empId2.startsWith("SEC/") || !empId2.endsWith("/JODO")) {
      throw new Error(`Invalid employee ID format for John Doe: ${empId2}`);
    }

    const serial1 = parseInt(empId1.split('/')[1]);
    const serial2 = parseInt(empId2.split('/')[1]);

    if (serial1 >= serial2) {
      throw new Error("Employee sequence did not increment properly");
    }
    console.log(`✅ Employee IDs generated: ${empId1}, ${empId2}`);

    // 3. Test concurrent ID generation
    console.log("Testing concurrent employee creation...");
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(EmployeeIdentityService.generateEmployeeId("Test", "User"));
    }
    const results = await Promise.all(promises);
    
    const uniqueIds = new Set(results);
    if (uniqueIds.size !== 10) {
      throw new Error("Concurrent ID generation produced duplicates!");
    }
    console.log("✅ Concurrent ID generation passed (10 unique IDs).");

    // 4. Test Employee Data Model
    console.log("Testing Employee Database model...");
    const emp = await db.employee.create({
      data: {
        employeeId: empId1,
        firstName: "Sagnik",
        lastName: "Kar",
        designation: "Developer",
        status: "ACTIVE"
      }
    });

    if (emp.status !== "ACTIVE") throw new Error("Default status failed");
    
    await db.employee.update({
      where: { id: emp.id },
      data: { status: "INACTIVE" }
    });
    
    const inactiveEmp = await db.employee.findUnique({ where: { id: emp.id } });
    if (inactiveEmp?.status !== "INACTIVE") throw new Error("Deactivate failed");

    console.log("✅ Employee data model passed.");
    
    // Clean up
    await db.employee.delete({ where: { id: emp.id } });
    await db.userRole.delete({ where: { userId_roleId: { userId: testUser.id, roleId: role.id } } });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.role.delete({ where: { id: role.id } });
    
    console.log("\n✅ All Phase 13 Tests Passed!");

  } catch (err) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runTests();
