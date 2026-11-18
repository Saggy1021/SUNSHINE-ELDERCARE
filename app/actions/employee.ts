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

async function logAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: any, database: any = db) {
  await database.auditLog.create({
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
    
    const { firstName, lastName, designation, contactNumber, email, dateOfBirth, photoReference, publicBiography } = parsed.data;

    // Check for duplicate email across employees
    const existingEmail = await db.employee.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive",
        },
      },
    });
    if (existingEmail) {
      return {
        success: false,
        error: `An employee with email "${email.trim()}" already exists.`,
      };
    }

    // Authoritative canonical Employee ID generation: strictly derived from first name, last name, and sequence
    // Frontend input is not allowed to override the authoritative ID
    const employeeId = await EmployeeIdentityService.generateEmployeeId(firstName, lastName);

    const dobDate = new Date(dateOfBirth);
    const digitsOnly = contactNumber.trim().replace(/\D/g, "");
    const normalizedContact =
      digitsOnly.length === 12 && digitsOnly.startsWith("91")
        ? digitsOnly.slice(2)
        : digitsOnly.length === 11 && digitsOnly.startsWith("0")
        ? digitsOnly.slice(1)
        : digitsOnly;

    // Creating an employee MUST NEVER create an administrator account or user login
    // Operational status is removed from registration and automatically set to default ACTIVE
    const employee = await db.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        designation,
        dateOfBirth: dobDate,
        contactNumber: normalizedContact,
        email: email.trim().toLowerCase(),
        photoReference: photoReference || null,
        status: "ACTIVE", // Default ACTIVE status
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

    if (data.firstName !== undefined && (!data.firstName || data.firstName.trim().length < 2)) {
      return { success: false, error: "First name must be at least 2 characters." };
    }
    if (data.lastName !== undefined && (!data.lastName || data.lastName.trim().length < 1)) {
      return { success: false, error: "Last name is required." };
    }
    if (data.designation !== undefined && (!data.designation || data.designation.trim().length < 2)) {
      return { success: false, error: "Designation is required." };
    }

    // Contact number validation (mandatory when editing)
    let sanitizedContact: string | null = current.contactNumber;
    if (data.contactNumber !== undefined) {
      const trimmedContact = data.contactNumber.trim();
      if (!trimmedContact) {
        return { success: false, error: "Contact / Mobile number is required." };
      }
      const digitsOnly = trimmedContact.replace(/\D/g, "");
      const is10 = digitsOnly.length === 10;
      const is12 = digitsOnly.length === 12 && digitsOnly.startsWith("91");
      const is11 = digitsOnly.length === 11 && digitsOnly.startsWith("0");
      if (!is10 && !is12 && !is11) {
        return { success: false, error: "Mobile number must be a valid 10-digit number." };
      }
      sanitizedContact = is12 ? digitsOnly.slice(2) : is11 ? digitsOnly.slice(1) : digitsOnly;
    }

    // Email validation and duplicate check
    let sanitizedEmail: string | null = current.email;
    if (data.email !== undefined) {
      const trimmedEmail = data.email.trim().toLowerCase();
      if (!trimmedEmail) {
        return { success: false, error: "Email address is required." };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return { success: false, error: "Invalid email address." };
      }
      // Check for conflict with another employee
      const existingEmail = await db.employee.findFirst({
        where: {
          email: {
            equals: trimmedEmail,
            mode: "insensitive",
          },
          id: { not: id },
        },
      });
      if (existingEmail) {
        return {
          success: false,
          error: `An employee with email "${trimmedEmail}" already exists.`,
        };
      }
      sanitizedEmail = trimmedEmail;
    }

    // Date of Birth validation
    let dobDate: Date | null = current.dateOfBirth;
    if (data.dateOfBirth !== undefined) {
      const dobStr = data.dateOfBirth?.trim();
      if (!dobStr) {
        return { success: false, error: "Date of Birth is required." };
      }
      const parsedDob = new Date(dobStr);
      if (isNaN(parsedDob.getTime())) {
        return { success: false, error: "Invalid Date of Birth format." };
      }
      const now = new Date();
      if (parsedDob > now) {
        return { success: false, error: "Date of Birth cannot be in the future." };
      }
      if (parsedDob.getFullYear() < 1900) {
        return { success: false, error: "Date of Birth year must be 1900 or later." };
      }
      dobDate = parsedDob;
    }

    // Employee ID must remain strictly read-only: do NOT allow changing employeeId
    const targetEmployeeId = current.employeeId;

    const employee = await db.employee.update({
      where: { id },
      data: {
        employeeId: targetEmployeeId,
        firstName: data.firstName !== undefined ? data.firstName.trim() : current.firstName,
        lastName: data.lastName !== undefined ? data.lastName.trim() : current.lastName,
        designation: data.designation !== undefined ? data.designation.trim() : current.designation,
        dateOfBirth: dobDate,
        contactNumber: sanitizedContact,
        email: sanitizedEmail,
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
 * Permanently deletes an employee profile and safely handles foreign-key relationships:
 * 1. Historical Care Visits (CareVisit): Retains all visit records, member associations,
 *    and appointment timings; detaches assignedEmpId (set to null) and appends former caregiver
 *    attribution notes to operationalNotes.
 * 2. Visit Assignments (VisitAssignment): Deletes assignment links for this employee.
 * 3. Care Assignments (CareAssignment): Deletes case assignment records for this employee,
 *    leaving the underlying CareCase and Member records intact.
 * 4. Care Tasks (CareTask): Retains tasks; detaches assignedEmpId (set to null) and appends
 *    former caregiver attribution notes to completionNote.
 * 5. Admin Invitations (AdminInvitation): Revokes any pending/existing invitations referencing
 *    this employee (employeeId: null, status: 'REVOKED').
 * 6. Administrative Credentials / User Account (User):
 *    - Strictly prevents deletion or revocation of Primary Owner (info.sunshineeldercare@gmail.com).
 *    - Revokes administrative credentials for other linked user accounts: deletes userRole records,
 *      sets user status to 'INACTIVE', and increments sessionVersion to invalidate active sessions.
 * 7. Permanently deletes the Employee record and records EMPLOYEE_DELETED in the AuditLog.
 *
 * No OTP is required.
 */
export async function deleteEmployeeCore(
  id: string,
  actorUserId: string,
  database: any = db
): Promise<{ success: boolean; hasDependencies?: boolean; error?: string; message?: string }> {
  const employee = await database.employee.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true } },
      visits: { select: { id: true, operationalNotes: true } },
      tasks: { select: { id: true, completionNote: true } },
      assignments: { select: { id: true } },
      visitAssignments: { select: { id: true } },
    },
  });

  if (!employee) return { success: false, error: "Employee not found." };

  // Strict Primary Owner Protection
  if (employee.user?.email === "info.sunshineeldercare@gmail.com") {
    return {
      success: false,
      error: "Protected account: The Primary Owner account (info.sunshineeldercare@gmail.com) cannot be deleted or revoked.",
    };
  }

  const runDeleteTx = async (tx: any) => {
    const formerNote = `[Formerly assigned to: ${employee.firstName} ${employee.lastName} (${employee.employeeId})]`;

    // 1. Preserve historical Care Visits:
    // Retain all visits, dates, status and tasks; detach employee and record former caregiver in operationalNotes
    if (employee.visits && employee.visits.length > 0 && tx.careVisit) {
      for (const visit of employee.visits) {
        const updatedNotes = visit.operationalNotes
          ? `${visit.operationalNotes}\n${formerNote}`
          : formerNote;
        await tx.careVisit.update({
          where: { id: visit.id },
          data: {
            assignedEmpId: null,
            operationalNotes: updatedNotes,
          },
        });
      }
    }

    // 2. Clean up VisitAssignments for this employee
    if (tx.visitAssignment) {
      await tx.visitAssignment.deleteMany({
        where: { employeeId: id },
      });
    }

    // 3. Clean up CareAssignments (caregiver case assignments - onDelete: Restrict)
    // Deleting these allows employee deletion while keeping CareCase and Member intact
    if (tx.careAssignment) {
      await tx.careAssignment.deleteMany({
        where: { employeeId: id },
      });
    }

    // 4. Preserve CareTasks:
    // Detach employee and record former caregiver in completionNote
    if (employee.tasks && employee.tasks.length > 0 && tx.careTask) {
      for (const task of employee.tasks) {
        const updatedCompNote = task.completionNote
          ? `${task.completionNote} ${formerNote}`
          : formerNote;
        await tx.careTask.update({
          where: { id: task.id },
          data: {
            assignedEmpId: null,
            completionNote: updatedCompNote,
          },
        });
      }
    }

    // 5. Clean up AdminInvitations referencing this employee
    if (tx.adminInvitation) {
      await tx.adminInvitation.updateMany({
        where: {
          OR: [
            { employeeId: employee.employeeId },
            { employeeId: employee.id },
          ],
        },
        data: {
          employeeId: null,
          status: "REVOKED",
        },
      });
    }

    // 6. Safely revoke linked administrative credentials (if any)
    if (employee.userId) {
      if (tx.userRole) {
        await tx.userRole.deleteMany({
          where: { userId: employee.userId },
        });
      }
      if (tx.user) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            status: "INACTIVE",
            sessionVersion: { increment: 1 },
          },
        });
      }
    }

    // 7. Permanently delete the employee profile record
    await tx.employee.delete({
      where: { id },
    });

    // 8. Record in AuditLog
    await logAudit(
      actorUserId,
      "EMPLOYEE_DELETED",
      "Employee",
      id,
      {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        designation: employee.designation,
        contactNumber: employee.contactNumber,
        email: employee.email,
        retainedVisitsCount: employee.visits?.length || 0,
        retainedTasksCount: employee.tasks?.length || 0,
        hadLinkedUser: Boolean(employee.userId),
        deletedAt: new Date().toISOString(),
      },
      tx
    );
  };

  if (typeof database.$transaction === "function") {
    await database.$transaction(runDeleteTx);
  } else {
    await runDeleteTx(database);
  }

  return {
    success: true,
    message: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) has been permanently deleted.`,
  };
}

/**
 * Server Action for permanently deleting an employee.
 * Safely cascades cleanup of assignments while preserving historical visits and tasks.
 * Strictly checks permissions and Primary Owner protection. Does not require OTP.
 */
export async function deleteEmployee(id: string): Promise<{ success: boolean; hasDependencies?: boolean; error?: string; message?: string }> {
  try {
    const admin = await requirePermission("EMPLOYEE_DEACTIVATE");
    const result = await deleteEmployeeCore(id, admin.userId, db);
    if (result.success) {
      revalidatePath('/admin/employees');
      revalidatePath('/admin/schedule');
      revalidatePath('/admin/care');
    }
    return result;
  } catch (err: any) {
    console.error("[deleteEmployee] Error:", err);
    return { success: false, error: err?.message || "Failed to delete employee." };
  }
}
