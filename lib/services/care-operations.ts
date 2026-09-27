import { db } from "../db";
import { AuthorizationService } from "./authorization";
import { PERMISSIONS } from "../auth/permissions";

/**
 * CareOperationsService — Phase 17
 *
 * Every mutation:
 *   1. Enforces a named care permission via AuthorizationService (DB-backed, server-side).
 *   2. Executes business record + AuditLog creation inside a single db.$transaction
 *      so neither can succeed without the other.
 *
 * actorUserId MUST always come from the authenticated server session — never from
 * the client request body, URL, or form fields.
 *
 * IMPORTANT: Care-note content (the `note` field) is NEVER written to AuditLog metadata.
 */
export class CareOperationsService {
  // ---------------------------------------------------------------------------
  // Care Cases
  // ---------------------------------------------------------------------------

  static async createCareCase(
    actorUserId: string,
    data: {
      elderId: string;
      subscriptionId: string;
      startDate: Date;
      endDate?: Date;
      operationalNotes?: string;
    }
  ) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_CASE_CREATE);

    // Validate subscription exists server-side
    const subscription = await db.subscription.findUnique({
      where: { id: data.subscriptionId },
    });
    if (!subscription) throw new Error("Subscription not found");

    return db.$transaction(async (tx) => {
      const careCase = await tx.careCase.create({
        data: {
          elderId: data.elderId,
          subscriptionId: data.subscriptionId,
          startDate: data.startDate,
          endDate: data.endDate,
          operationalNotes: data.operationalNotes,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CARE_CASE_CREATED",
          entityType: "CareCase",
          entityId: careCase.id,
          metadata: {
            elderId: data.elderId,
            subscriptionId: data.subscriptionId,
            startDate: data.startDate.toISOString(),
          },
        },
      });

      return careCase;
    });
  }

  static async viewCareCase(actorUserId: string, careCaseId: string) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_CASE_VIEW);
    return db.careCase.findUnique({
      where: { id: careCaseId },
      include: {
        elder: true,
        subscription: { include: { carePlan: true, customPlan: true } },
        assignments: { include: { employee: true } },
        visits: {
          include: { assignedEmp: true, tasks: true },
          orderBy: { scheduledStart: "desc" },
        },
        notes: {
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Care Assignments
  // ---------------------------------------------------------------------------

  static async assignCaregiver(
    actorUserId: string,
    data: {
      careCaseId: string;
      employeeId: string;
      role?: string;
      startDate?: Date;
    }
  ) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_ASSIGNMENT_MANAGE);

    return db.$transaction(async (tx) => {
      const assignment = await tx.careAssignment.create({
        data: {
          careCaseId: data.careCaseId,
          employeeId: data.employeeId,
          role: data.role || "PRIMARY_CAREGIVER",
          startDate: data.startDate || new Date(),
          assignedById: actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CARE_ASSIGNMENT_CREATED",
          entityType: "CareAssignment",
          entityId: assignment.id,
          metadata: {
            careCaseId: data.careCaseId,
            employeeId: data.employeeId,
            role: assignment.role,
          },
        },
      });

      return assignment;
    });
  }

  static async viewAssignments(actorUserId: string, careCaseId: string) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_ASSIGNMENT_VIEW);
    return db.careAssignment.findMany({
      where: { careCaseId },
      include: { employee: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Care Visits
  // ---------------------------------------------------------------------------

  static async scheduleCareVisit(
    actorUserId: string,
    data: {
      careCaseId: string;
      assignedEmpId?: string;
      scheduledStart: Date;
      scheduledEnd: Date;
      operationalNotes?: string;
    }
  ) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_VISIT_MANAGE);

    return db.$transaction(async (tx) => {
      const visit = await tx.careVisit.create({
        data: {
          careCaseId: data.careCaseId,
          assignedEmpId: data.assignedEmpId,
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          status: "SCHEDULED",
          operationalNotes: data.operationalNotes,
          createdById: actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CARE_VISIT_SCHEDULED",
          entityType: "CareVisit",
          entityId: visit.id,
          metadata: {
            careCaseId: data.careCaseId,
            assignedEmpId: data.assignedEmpId ?? null,
            scheduledStart: data.scheduledStart.toISOString(),
            scheduledEnd: data.scheduledEnd.toISOString(),
          },
        },
      });

      return visit;
    });
  }

  static async viewVisits(actorUserId: string, careCaseId: string) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_VISIT_VIEW);
    return db.careVisit.findMany({
      where: { careCaseId },
      include: { assignedEmp: true, tasks: true },
      orderBy: { scheduledStart: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Care Tasks
  // ---------------------------------------------------------------------------

  static async addCareTask(
    actorUserId: string,
    data: {
      careCaseId: string;
      careVisitId?: string;
      title: string;
      description?: string;
      assignedEmpId?: string;
      scheduledFor?: Date;
    }
  ) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_TASK_MANAGE);

    return db.$transaction(async (tx) => {
      const task = await tx.careTask.create({
        data: {
          careCaseId: data.careCaseId,
          careVisitId: data.careVisitId,
          title: data.title,
          description: data.description,
          assignedEmpId: data.assignedEmpId,
          scheduledFor: data.scheduledFor,
          createdById: actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CARE_TASK_CREATED",
          entityType: "CareTask",
          entityId: task.id,
          metadata: {
            careCaseId: data.careCaseId,
            careVisitId: data.careVisitId ?? null,
            title: data.title,
            assignedEmpId: data.assignedEmpId ?? null,
          },
        },
      });

      return task;
    });
  }

  static async viewTasks(actorUserId: string, careCaseId: string) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_TASK_VIEW);
    return db.careTask.findMany({
      where: { careCaseId },
      include: { assignedEmp: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Care Notes
  // ---------------------------------------------------------------------------

  /**
   * Creates a care note.
   * RESTRICTED notes additionally require CARE_RESTRICTED_NOTE_VIEW permission
   * to ensure only staff with explicit access can create the most sensitive entries.
   *
   * IMPORTANT: The `note` content is NEVER written to AuditLog metadata.
   */
  static async addCareNote(
    actorUserId: string,
    data: {
      careCaseId: string;
      note: string;
      visibility?: "INTERNAL" | "MEMBER_VISIBLE" | "RESTRICTED";
      careVisitId?: string;
      careTaskId?: string;
    }
  ) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_NOTE_CREATE);

    const visibility = data.visibility || "INTERNAL";

    // Creating a RESTRICTED note requires the elevated permission
    if (visibility === "RESTRICTED") {
      await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_RESTRICTED_NOTE_VIEW);
    }

    return db.$transaction(async (tx) => {
      const careNote = await tx.careNote.create({
        data: {
          authorId: actorUserId,
          careCaseId: data.careCaseId,
          note: data.note, // stored in DB only — NEVER echoed into audit metadata
          visibility,
          careVisitId: data.careVisitId,
          careTaskId: data.careTaskId,
        },
      });

      // AUDIT — note content is deliberately excluded from metadata
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CARE_NOTE_CREATED",
          entityType: "CareNote",
          entityId: careNote.id,
          metadata: {
            careCaseId: data.careCaseId,
            visibility,
            careVisitId: data.careVisitId ?? null,
            careTaskId: data.careTaskId ?? null,
            // note content intentionally omitted
          },
        },
      });

      return careNote;
    });
  }

  /**
   * Returns notes for a care case filtered by visibility.
   *
   * - MEMBER_VISIBLE: any authenticated caller with CARE_NOTE_VIEW
   * - INTERNAL: requires CARE_NOTE_VIEW (staff/admin only)
   * - RESTRICTED: requires CARE_RESTRICTED_NOTE_VIEW
   *
   * Members MUST use the member portal query directly (which hard-filters
   * to MEMBER_VISIBLE by userId ownership) — they do NOT call this service method.
   */
  static async viewNotes(
    actorUserId: string,
    careCaseId: string,
    includeRestricted = false
  ) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_NOTE_VIEW);

    if (includeRestricted) {
      await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_RESTRICTED_NOTE_VIEW);
    }

    const visibilityFilter = includeRestricted
      ? { in: ["INTERNAL", "MEMBER_VISIBLE", "RESTRICTED"] as const }
      : { in: ["INTERNAL", "MEMBER_VISIBLE"] as const };

    return db.careNote.findMany({
      where: { careCaseId, visibility: visibilityFilter },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Legacy compatibility — detail fetch used by admin portal
  // Now includes permission check.
  // ---------------------------------------------------------------------------

  static async getCareCaseDetails(actorUserId: string, careCaseId: string) {
    await AuthorizationService.require(actorUserId, PERMISSIONS.CARE_CASE_VIEW);

    return db.careCase.findUnique({
      where: { id: careCaseId },
      include: {
        elder: true,
        subscription: { include: { carePlan: true, customPlan: true } },
        assignments: { include: { employee: true } },
        visits: {
          include: { assignedEmp: true, tasks: true },
          orderBy: { scheduledStart: "desc" },
        },
        notes: {
          // Staff/admin view: INTERNAL + MEMBER_VISIBLE; RESTRICTED excluded unless separately queried
          where: { visibility: { in: ["INTERNAL", "MEMBER_VISIBLE"] } },
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }
}
