"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AuthorizationService } from "@/lib/services/authorization"
import { EmployeeIdentityService } from "@/lib/services/employee-identity"
import { employeeSchema, EmployeeInput } from "@/lib/validations/employee"
import { revalidatePath } from "next/cache"
import { RateLimitService } from "@/lib/services/rate-limit"

async function requirePermission(permission: string): Promise<{ userId: string; email: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized access.")
  }
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  await AuthorizationService.require(session.user.id, permission, session.user.email)
  return { userId: session.user.id, email: session.user.email || "" }
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

export async function createEmployee(data: EmployeeInput): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_CREATE")

    const parsed = employeeSchema.safeParse(data);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "Invalid employee data";
      return { success: false, error: firstErr };
    }
    
    const { firstName, lastName, designation, contactNumber, email, photoReference, status, publicBiography } = parsed.data;

    let employeeId = (data.employeeId || "").trim();

    if (employeeId) {
      // Validate custom employee ID format and uniqueness
      const existing = await db.employee.findUnique({ where: { employeeId } });
      if (existing) {
        return { success: false, error: `An employee with Employee ID "${employeeId}" already exists.` };
      }
    } else {
      // Auto-generate canonical Employee ID (e.g. SEC/101/SAKA)
      employeeId = await EmployeeIdentityService.generateEmployeeId(firstName, lastName);
    }

    // Creating an employee MUST NEVER create an administrator account or user login
    const employee = await db.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        designation,
        contactNumber: contactNumber || null,
        email: email || null,
        photoReference: photoReference || null,
        status: status || "ACTIVE",
        publicBiography: publicBiography || null,
        userId: null, // Zero dashboard access
      }
    });

    await logAudit(admin.userId, "EMPLOYEE_CREATED", "Employee", employee.id, {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      designation: employee.designation,
      status: employee.status,
    });

    revalidatePath('/admin/employees');
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/care');

    return { success: true, employee };
  } catch (err: any) {
    console.error("[createEmployee] Error:", err);
    return { success: false, error: err?.message || "Failed to create employee." };
  }
}

export async function updateEmployee(id: string, data: Partial<EmployeeInput>): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_EDIT")

    const current = await db.employee.findUnique({ where: { id } });
    if (!current) return { success: false, error: "Employee not found." };

    let targetEmployeeId = current.employeeId;
    if (data.employeeId && data.employeeId.trim() !== current.employeeId) {
      targetEmployeeId = data.employeeId.trim();
      const existing = await db.employee.findFirst({
        where: {
          employeeId: targetEmployeeId,
          id: { not: id },
        },
      });
      if (existing) {
        return { success: false, error: `An employee with Employee ID "${targetEmployeeId}" already exists.` };
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
        employeeId: targetEmployeeId,
        firstName: data.firstName !== undefined ? data.firstName.trim() : current.firstName,
        lastName: data.lastName !== undefined ? data.lastName.trim() : current.lastName,
        designation: data.designation !== undefined ? data.designation.trim() : current.designation,
        contactNumber: data.contactNumber !== undefined ? (data.contactNumber?.trim() || null) : current.contactNumber,
        email: data.email !== undefined ? (data.email?.trim() || null) : current.email,
        photoReference: data.photoReference !== undefined ? data.photoReference : current.photoReference,
        status: data.status || current.status,
        publicBiography: data.publicBiography !== undefined ? data.publicBiography : current.publicBiography,
      }
    });

    await logAudit(admin.userId, "EMPLOYEE_UPDATED", "Employee", employee.id, {
      updatedFields: Object.keys(data),
      employeeId: employee.employeeId,
    });

    revalidatePath('/admin/employees');
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/care');

    return { success: true, employee };
  } catch (err: any) {
    console.error("[updateEmployee] Error:", err);
    return { success: false, error: err?.message || "Failed to update employee." };
  }
}

export async function toggleEmployeeStatus(id: string): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_DEACTIVATE")

    const current = await db.employee.findUnique({ where: { id } });
    if (!current) return { success: false, error: "Employee not found." };

    const newStatus = current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const actionName = newStatus === "ACTIVE" ? "EMPLOYEE_ACTIVATED" : "EMPLOYEE_DEACTIVATED";

    const employee = await db.employee.update({
      where: { id },
      data: { status: newStatus }
    });

    await logAudit(admin.userId, actionName, "Employee", employee.id, {
      employeeId: employee.employeeId,
      previousStatus: current.status,
      newStatus,
    });

    revalidatePath('/admin/employees');
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/care');

    return { success: true, employee };
  } catch (err: any) {
    console.error("[toggleEmployeeStatus] Error:", err);
    return { success: false, error: err?.message || "Failed to update employee status." };
  }
}

export async function activateEmployee(id: string): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_EDIT")

    const employee = await db.employee.update({
      where: { id },
      data: { status: "ACTIVE" }
    });

    await logAudit(admin.userId, "EMPLOYEE_ACTIVATED", "Employee", employee.id, {
      employeeId: employee.employeeId,
    });

    revalidatePath('/admin/employees');
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/care');

    return { success: true, employee };
  } catch (err: any) {
    console.error("[activateEmployee] Error:", err);
    return { success: false, error: err?.message || "Failed to activate employee." };
  }
}

export async function deactivateEmployee(id: string): Promise<{ success: boolean; employee?: any; error?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_DEACTIVATE")

    const employee = await db.employee.update({
      where: { id },
      data: { status: "INACTIVE" }
    });

    await logAudit(admin.userId, "EMPLOYEE_DEACTIVATED", "Employee", employee.id, {
      employeeId: employee.employeeId,
    });

    revalidatePath('/admin/employees');
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/care');

    return { success: true, employee };
  } catch (err: any) {
    console.error("[deactivateEmployee] Error:", err);
    return { success: false, error: err?.message || "Failed to deactivate employee." };
  }
}

/**
 * Deletes an employee only if there are zero historical care visits, assignments or tasks.
 * Intended for safe cleanup of disposable test records.
 */
export async function deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_DEACTIVATE");

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        visits: { select: { id: true }, take: 1 },
        visitAssignments: { select: { id: true }, take: 1 },
        assignments: { select: { id: true }, take: 1 },
        tasks: { select: { id: true }, take: 1 },
      },
    });

    if (!employee) return { success: false, error: "Employee not found." };

    if (
      employee.visits.length > 0 ||
      employee.visitAssignments.length > 0 ||
      employee.assignments.length > 0 ||
      employee.tasks.length > 0
    ) {
      return {
        success: false,
        error: "Cannot delete an employee with historical appointments or assignments. Please deactivate the employee instead.",
      };
    }

    await db.employee.delete({ where: { id } });

    await logAudit(admin.userId, "EMPLOYEE_DELETED", "Employee", id, {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
    });

    revalidatePath('/admin/employees');
    revalidatePath('/admin/schedule');
    revalidatePath('/admin/care');

    return { success: true };
  } catch (err: any) {
    console.error("[deleteEmployee] Error:", err);
    return { success: false, error: err?.message || "Failed to delete employee." };
  }
}
