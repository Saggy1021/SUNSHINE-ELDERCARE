"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AuthorizationService } from "@/lib/services/authorization"
import { EmployeeIdentityService } from "@/lib/services/employee-identity"
import { employeeSchema, EmployeeInput } from "@/lib/validations/employee"
import { revalidatePath } from "next/cache"

async function requirePermission(permission: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized access.")
  }
  await AuthorizationService.require(session.user.id, permission)
  return session.user.id
}

async function logAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: any) {
  await db.auditLog.create({
    data: {
      actorUserId: actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || {}
    }
  })
}

export async function getEmployees() {
  await requirePermission("EMPLOYEE_VIEW")
  return db.employee.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createEmployee(data: EmployeeInput) {
  const adminId = await requirePermission("EMPLOYEE_CREATE")

  const parsed = employeeSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid employee data")
  }
  
  const { firstName, lastName, designation, contactNumber, email, photoReference, status } = parsed.data;

  // Generate ID
  const employeeId = await EmployeeIdentityService.generateEmployeeId(firstName, lastName);

  const employee = await db.employee.create({
    data: {
      employeeId,
      firstName,
      lastName,
      designation,
      contactNumber,
      email: email || null,
      photoReference,
      status: status || "ACTIVE",
    }
  });

  await logAudit(adminId, "EMPLOYEE_CREATED", "Employee", employee.id, {
    employeeId: employee.employeeId
  });

  revalidatePath('/admin/employees');
  return employee;
}

export async function updateEmployee(id: string, data: Partial<EmployeeInput>) {
  const adminId = await requirePermission("EMPLOYEE_EDIT")

  const current = await db.employee.findUnique({ where: { id } });
  if (!current) throw new Error("Employee not found");

  const employee = await db.employee.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      designation: data.designation,
      contactNumber: data.contactNumber,
      email: data.email || null,
      photoReference: data.photoReference,
      status: data.status,
    }
  });

  await logAudit(adminId, "EMPLOYEE_UPDATED", "Employee", employee.id, {
    updatedFields: Object.keys(data)
  });

  revalidatePath('/admin/employees');
  return employee;
}

export async function deactivateEmployee(id: string) {
  const adminId = await requirePermission("EMPLOYEE_DEACTIVATE")

  const employee = await db.employee.update({
    where: { id },
    data: { status: "INACTIVE" }
  });

  await logAudit(adminId, "EMPLOYEE_DEACTIVATED", "Employee", employee.id);

  revalidatePath('/admin/employees');
  return employee;
}
