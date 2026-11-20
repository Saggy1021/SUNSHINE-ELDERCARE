import { db } from "@/lib/db";

export type EmergencyStatus =
  | "TRIGGERED"
  | "ACKNOWLEDGED"
  | "DISPATCHED"
  | "RESPONDER_ON_SCENE"
  | "RESOLVED"
  | "CANCELLED";

export type EmergencyClassification = "CODE_RED" | "CODE_YELLOW" | "CODE_GREEN";

export type EmergencyTriggerSource =
  | "MEMBER_APP_SOS"
  | "WEB_SOS"
  | "HELPLINE_CALL"
  | "MANUAL_ENTRY";

export interface CreateIncidentParams {
  userId?: string | null;
  memberId?: string | null;
  callerName?: string | null;
  callerPhone?: string | null;
  triggerSource?: EmergencyTriggerSource;
  triggerNotes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  fallbackAddress?: string | null;
  initialClassification?: EmergencyClassification;
}

export interface ClassifyIncidentParams {
  incidentId: string;
  newClassification: EmergencyClassification;
  reason: string;
  actorId: string;
  actorName: string;
  isSupervisor: boolean;
}

export interface DispatchResponderParams {
  incidentId: string;
  employeeId: string;
  notes?: string;
  actorId: string;
  actorName: string;
}

export interface RecordArrivalParams {
  incidentId: string;
  notes?: string;
  actorId: string;
  actorName: string;
}

export interface SafetyConfirmationParams {
  incidentId: string;
  confirmedBy: string;
  safetyNotes: string;
  actorId: string;
  actorName: string;
}

export interface LogCallParams {
  incidentId: string;
  recipient: string;
  phone: string;
  outcome: "ANSWERED" | "BUSY" | "NO_ANSWER" | "VOICEMAIL" | "FAILED";
  details: string;
  actorId: string;
  actorName: string;
}

export class EmergencyService {
  private static async resolveAuthorId(client: any, actorId?: string | null): Promise<string | null> {
    if (!actorId) return null;
    try {
      const u = await client.user.findUnique({ where: { id: actorId }, select: { id: true } });
      return u ? u.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Generates a date-based sequence incident number, e.g. EMG-20261120-001
   */
  static async generateIncidentNumber(tx?: any): Promise<string> {
    const client = tx || db;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const datePrefix = formatter.format(now).replace(/-/g, ""); // YYYYMMDD

    const seq = await client.emergencySequence.upsert({
      where: { datePrefix },
      update: { current: { increment: 1 } },
      create: { datePrefix, current: 1 },
    });

    return `EMG-${datePrefix}-${String(seq.current).padStart(3, "0")}`;
  }

  /**
   * Creates a new emergency incident and logs its trigger event.
   */
  static async createIncident(params: CreateIncidentParams) {
    let callerName = params.callerName || null;
    let callerPhone = params.callerPhone || null;
    let memberId = params.memberId || null;
    let fallbackAddress = params.fallbackAddress || null;

    // Enriched caller & member info if userId provided
    if (params.userId) {
      const user = await db.user.findUnique({
        where: { id: params.userId },
        include: { memberProfile: true, emergencyContact: true },
      });

      if (user) {
        if (!callerName) callerName = user.name || (user.memberProfile ? `${user.memberProfile.salutation || ''} ${user.memberProfile.firstName} ${user.memberProfile.lastName}`.trim() : null);
        if (!callerPhone) callerPhone = user.memberProfile?.mobileNumber || user.emergencyContact?.phone || null;
        if (!memberId) memberId = user.memberProfile?.memberId || null;
        if (!fallbackAddress && user.memberProfile) {
          fallbackAddress = user.memberProfile.serviceAddress || null;
        }
      }
    }

    return db.$transaction(async (tx) => {
      const incidentNumber = await this.generateIncidentNumber(tx);
      const classification = params.initialClassification || "CODE_RED";
      const triggerSource = params.triggerSource || "MEMBER_APP_SOS";

      const incident = await tx.emergencyIncident.create({
        data: {
          incidentNumber,
          status: "TRIGGERED",
          classification,
          userId: params.userId || null,
          memberId,
          callerName,
          callerPhone,
          triggerSource,
          triggerNotes: params.triggerNotes || null,
          currentLatitude: params.latitude ?? null,
          currentLongitude: params.longitude ?? null,
          locationAccuracy: params.accuracy ?? null,
          locationTimestamp: params.latitude ? new Date() : null,
          trackingActive: true,
          fallbackAddress,
        },
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId: incident.id,
          authorId: params.userId || null,
          authorName: callerName || "System / Member",
          action: "TRIGGERED",
          details: `Emergency SOS incident ${incidentNumber} triggered via ${triggerSource}. Initial classification: ${classification}.`,
        },
      });

      return incident;
    });
  }

  /**
   * Operator acknowledges an incident.
   */
  static async acknowledgeIncident(incidentId: string, actorId: string, actorName: string) {
    const existing = await db.emergencyIncident.findUnique({ where: { id: incidentId } });
    if (!existing) throw new Error("Incident not found");

    if (existing.status !== "TRIGGERED") {
      return existing; // Already acknowledged or progressing
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.emergencyIncident.update({
        where: { id: incidentId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          acknowledgedById: actorId,
        },
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId,
          authorId: actorId,
          authorName: actorName,
          action: "ACKNOWLEDGED",
          details: `Incident acknowledged by operator ${actorName}. SLA timer checked.`,
        },
      });

      return updated;
    });
  }

  /**
   * Classify incident. Code Red downgrade strictly requires supervisor authority.
   */
  static async classifyIncident(params: ClassifyIncidentParams) {
    const incident = await db.emergencyIncident.findUnique({ where: { id: params.incidentId } });
    if (!incident) throw new Error("Incident not found");

    const isDowngrade =
      incident.classification === "CODE_RED" &&
      (params.newClassification === "CODE_YELLOW" || params.newClassification === "CODE_GREEN");

    if (isDowngrade && !params.isSupervisor) {
      throw new Error("Downgrading a CODE RED incident strictly requires supervisor authorization.");
    }

    if (isDowngrade && (!params.reason || params.reason.trim().length < 5)) {
      throw new Error("A detailed reason is mandatory when downgrading a CODE RED incident.");
    }

    return db.$transaction(async (tx) => {
      const updateData: any = {
        previousClassification: incident.classification,
        classification: params.newClassification,
      };

      if (isDowngrade) {
        updateData.downgradedById = params.actorId;
        updateData.downgradeReason = params.reason;
        updateData.downgradeApprovedAt = new Date();
      }

      const updated = await tx.emergencyIncident.update({
        where: { id: params.incidentId },
        data: updateData,
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId: params.incidentId,
          authorId: await this.resolveAuthorId(tx, params.actorId),
          authorName: params.actorName,
          action: isDowngrade ? "DOWNGRADED" : "CLASSIFIED",
          details: isDowngrade
            ? `Downgraded from ${incident.classification} to ${params.newClassification}. Supervisor Authorization: ${params.actorName}. Reason: ${params.reason}`
            : `Classification updated to ${params.newClassification}. Operator: ${params.actorName}. Reason: ${params.reason || "Operational review"}`,
        },
      });

      return updated;
    });
  }

  /**
   * Dispatches a field employee/responder.
   */
  static async dispatchResponder(params: DispatchResponderParams) {
    const employee = await db.employee.findUnique({
      where: { id: params.employeeId },
    });
    if (!employee) throw new Error("Employee not found");

    return db.$transaction(async (tx) => {
      const updated = await tx.emergencyIncident.update({
        where: { id: params.incidentId },
        data: {
          status: "DISPATCHED",
          assignedEmployeeId: params.employeeId,
          dispatchNotes: params.notes || null,
          dispatchedAt: new Date(),
        },
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId: params.incidentId,
          authorId: await this.resolveAuthorId(tx, params.actorId),
          authorName: params.actorName,
          action: "DISPATCHED",
          details: `Dispatched field responder ${employee.firstName} ${employee.lastName} (${employee.employeeId}). Operator: ${params.actorName}. Notes: ${params.notes || "None"}`,
        },
      });

      return updated;
    });
  }

  /**
   * Records responder arrival on scene.
   */
  static async recordArrival(params: RecordArrivalParams) {
    return db.$transaction(async (tx) => {
      const updated = await tx.emergencyIncident.update({
        where: { id: params.incidentId },
        data: {
          status: "RESPONDER_ON_SCENE",
          responderArrivedAt: new Date(),
        },
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId: params.incidentId,
          authorId: await this.resolveAuthorId(tx, params.actorId),
          authorName: params.actorName,
          action: "ARRIVED",
          details: `Field responder arrived on scene. Recorded by ${params.actorName}. Notes: ${params.notes || "None"}`,
        },
      });

      return updated;
    });
  }

  /**
   * Records safety confirmation of member.
   */
  static async recordSafetyConfirmation(params: SafetyConfirmationParams) {
    if (!params.safetyNotes || params.safetyNotes.trim().length === 0) {
      throw new Error("Safety notes are required to confirm safety.");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.emergencyIncident.update({
        where: { id: params.incidentId },
        data: {
          safetyConfirmedAt: new Date(),
          safetyConfirmedBy: params.confirmedBy,
          safetyNotes: params.safetyNotes,
        },
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId: params.incidentId,
          authorId: await this.resolveAuthorId(tx, params.actorId),
          authorName: params.actorName,
          action: "SAFETY_CONFIRMED",
          details: `Member safety confirmed by ${params.confirmedBy}. Recorded by ${params.actorName}. Notes: ${params.safetyNotes}`,
        },
      });

      return updated;
    });
  }

  /**
   * Logs a phone call made regarding the incident.
   */
  static async logCall(params: LogCallParams) {
    const authorId = await this.resolveAuthorId(db, params.actorId);
    return db.emergencyIncidentLog.create({
      data: {
        incidentId: params.incidentId,
        authorId,
        authorName: params.actorName,
        action: "CALL_LOGGED",
        callRecipient: params.recipient,
        callPhone: params.phone,
        callOutcome: params.outcome,
        details: `Call to ${params.recipient} (${params.phone}) - Outcome: ${params.outcome}. Notes: ${params.details || "None"}`,
      },
    });
  }

  /**
   * Adds an operational note to the incident timeline.
   */
  static async addNote(params: { incidentId: string; note: string; actorId: string; actorName: string }) {
    const authorId = await this.resolveAuthorId(db, params.actorId);
    return db.emergencyIncidentLog.create({
      data: {
        incidentId: params.incidentId,
        authorId,
        authorName: params.actorName,
        action: "NOTE_ADDED",
        details: params.note,
      },
    });
  }

  /**
   * Resolves and closes an incident. Immediately cuts off tracking.
   */
  static async resolveIncident(params: {
    incidentId: string;
    resolutionNotes: string;
    actorId: string;
    actorName: string;
  }) {
    if (!params.resolutionNotes || params.resolutionNotes.trim().length < 5) {
      throw new Error("A resolution summary of at least 5 characters is required.");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.emergencyIncident.update({
        where: { id: params.incidentId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedById: params.actorId,
          resolutionNotes: params.resolutionNotes,
          trackingActive: false, // Strict privacy cut-off
        },
      });

      await tx.emergencyIncidentLog.create({
        data: {
          incidentId: params.incidentId,
          authorId: await this.resolveAuthorId(tx, params.actorId),
          authorName: params.actorName,
          action: "RESOLVED",
          details: `Incident resolved and closed. Operator: ${params.actorName}. GPS tracking terminated. Summary: ${params.resolutionNotes}`,
        },
      });

      return updated;
    });
  }

  /**
   * Ingests GPS telemetry. Returns 410 (Gone) indicator if tracking is inactive or incident is resolved.
   */
  static async updateTelemetry(params: {
    incidentId: string;
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  }) {
    const incident = await db.emergencyIncident.findUnique({
      where: { id: params.incidentId },
      select: { id: true, status: true, trackingActive: true },
    });

    if (!incident) {
      return { found: false, active: false };
    }

    if (
      incident.status === "RESOLVED" ||
      incident.status === "CANCELLED" ||
      !incident.trackingActive
    ) {
      return { found: true, active: false }; // Calling endpoint should return HTTP 410
    }

    await db.emergencyIncident.update({
      where: { id: params.incidentId },
      data: {
        currentLatitude: params.latitude,
        currentLongitude: params.longitude,
        locationAccuracy: params.accuracy ?? null,
        locationTimestamp: new Date(),
      },
    });

    return { found: true, active: true };
  }

  /**
   * Fetches the dashboard feed of active incidents and summary counts.
   */
  static async getDashboardFeed() {
    const activeStatuses: EmergencyStatus[] = [
      "TRIGGERED",
      "ACKNOWLEDGED",
      "DISPATCHED",
      "RESPONDER_ON_SCENE",
    ];

    const [activeIncidents, resolvedTodayCount] = await Promise.all([
      db.emergencyIncident.findMany({
        where: { status: { in: activeStatuses } },
        include: {
          assignedEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              contactNumber: true,
              employeeId: true,
            },
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          _count: {
            select: {
              logs: {
                where: { action: "CALL_LOGGED" },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { triggeredAt: "desc" }],
      }),
      // Count resolved today
      db.emergencyIncident.count({
        where: {
          status: "RESOLVED",
          resolvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Active incidents sorted newest first by creation timestamp (createdAt / triggeredAt descending)
    activeIncidents.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.triggeredAt).getTime();
      const timeB = new Date(b.createdAt || b.triggeredAt).getTime();
      return timeB - timeA;
    });

    const codeRedCount = activeIncidents.filter((i) => i.classification === "CODE_RED").length;
    const pendingCallbacksCount = activeIncidents.filter((i) => i._count.logs === 0).length;
    const awaitingSafetyCount = activeIncidents.filter(
      (i) => (i.status === "DISPATCHED" || i.status === "RESPONDER_ON_SCENE") && !i.safetyConfirmedAt
    ).length;

    return {
      activeIncidents,
      metrics: {
        activeCount: activeIncidents.length,
        codeRedCount,
        pendingCallbacksCount,
        awaitingSafetyCount,
        resolvedTodayCount,
      },
    };
  }

  /**
   * Fetches single incident with full details, medical/member info, logs, and responder.
   */
  static async getIncidentById(incidentId: string) {
    const incident = await db.emergencyIncident.findUnique({
      where: { id: incidentId },
      include: {
        assignedEmployee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            contactNumber: true,
            designation: true,
          },
        },
        downgradedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emergencyContact: true,
            subscriptions: {
              where: { status: "ACTIVE" },
              select: {
                status: true,
                carePlan: { select: { name: true } },
                variantType: true,
                durationMonths: true,
              },
              take: 1,
            },
            memberProfile: {
              include: {
                sponsor: true,
                medicalAuth: true,
              },
            },
          },
        },
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return incident;
  }

  /**
   * Fetches incident history with search and pagination.
   */
  static async getIncidentHistory(params: {
    query?: string;
    classification?: string;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params.classification && params.classification !== "ALL") {
      where.classification = params.classification;
    }

    if (params.fromDate || params.toDate) {
      where.triggeredAt = {};
      if (params.fromDate) where.triggeredAt.gte = params.fromDate;
      if (params.toDate) where.triggeredAt.lte = params.toDate;
    }

    if (params.query && params.query.trim().length > 0) {
      const q = params.query.trim();
      where.OR = [
        { incidentNumber: { contains: q, mode: "insensitive" } },
        { memberId: { contains: q, mode: "insensitive" } },
        { callerName: { contains: q, mode: "insensitive" } },
        { callerPhone: { contains: q, mode: "insensitive" } },
        { fallbackAddress: { contains: q, mode: "insensitive" } },
      ];
    }

    const [incidents, total] = await Promise.all([
      db.emergencyIncident.findMany({
        where,
        include: {
          assignedEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
          _count: {
            select: { logs: true },
          },
        },
        orderBy: { triggeredAt: "desc" },
        skip,
        take: limit,
      }),
      db.emergencyIncident.count({ where }),
    ]);

    return {
      incidents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Available active employees for emergency dispatch.
   */
  static async getAvailableResponders() {
    return db.employee.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        contactNumber: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }
}
