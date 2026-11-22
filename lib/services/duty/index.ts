import { db as prisma } from "@/lib/db";

let activeDb: any = prisma;

export function setDutyDb(client: any) {
  activeDb = client;
}

/**
 * Normalizes a date into Asia/Kolkata (IST) day boundaries:
 * Midnight IST (00:00:00.000+05:30) to End of Day IST (23:59:59.999+05:30).
 */
export function getISTDayBoundaries(targetDate: Date = new Date()) {
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = istFormatter.formatToParts(targetDate);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  const startOfDayIST = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  const endOfDayIST = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);
  return { startOfDayIST, endOfDayIST, dateString: `${year}-${month}-${day}` };
}

export function formatTime12HourIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDurationHours(durationMinutes: number): string {
  const hrs = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  return `${mins} min${mins !== 1 ? "s" : ""}`;
}

export interface StartDutyParams {
  employeeId: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface EndDutyParams {
  employeeId: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface CorrectionParams {
  dutySessionId?: string;
  employeeId: string;
  adminUserId: string;
  adminEmail: string;
  reason: string;
  startTime?: Date;
  endTime?: Date;
  status?: string;
}

export class DutyService {
  /**
   * Retrieves the current duty status for an employee.
   * Includes active session info, accumulated duration for today (in IST), and leave status.
   */
  static async getDutyStatus(employeeId: string, targetDate: Date = new Date()) {
    const employee = await activeDb.employee.findUnique({
      where: { id: employeeId },
      include: {
        dutySessions: {
          where: { status: "ON_DUTY" },
          orderBy: { startTime: "desc" },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new Error(`Employee with ID '${employeeId}' not found.`);
    }

    const { startOfDayIST, endOfDayIST } = getISTDayBoundaries(targetDate);
    const now = new Date();

    // Check approved leave for today
    const activeLeave = await activeDb.employeeLeaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: "APPROVED",
        startDate: { lte: endOfDayIST },
        endDate: { gte: startOfDayIST },
      },
    });

    // Calculate today's completed sessions
    const todaySessions = await activeDb.dutySession.findMany({
      where: {
        employeeId: employee.id,
        startTime: { gte: startOfDayIST, lte: endOfDayIST },
      },
      orderBy: { startTime: "asc" },
    });

    let totalDurationTodayMinutes = 0;
    for (const session of todaySessions) {
      if (session.status === "COMPLETED" && session.durationMinutes) {
        totalDurationTodayMinutes += session.durationMinutes;
      } else if (session.status === "ON_DUTY") {
        const activeMins = Math.max(0, Math.round((now.getTime() - session.startTime.getTime()) / 60000));
        totalDurationTodayMinutes += activeMins;
      }
    }

    const activeSession = employee.dutySessions[0] || null;
    const isOnDuty = Boolean(activeSession && activeSession.status === "ON_DUTY");

    let activeSessionDisplay: any = null;
    if (activeSession) {
      const activeDurationMins = Math.max(0, Math.round((now.getTime() - activeSession.startTime.getTime()) / 60000));
      activeSessionDisplay = {
        id: activeSession.id,
        startTime: activeSession.startTime.toISOString(),
        startTimeDisplay: formatTime12HourIST(activeSession.startTime),
        startDateDisplay: formatDateIST(activeSession.startTime),
        durationMinutes: activeDurationMins,
        durationDisplay: formatDurationHours(activeDurationMins),
        notes: activeSession.notes,
      };
    }

    const dutyStatus = Boolean(activeLeave) ? "ON_LEAVE" : isOnDuty ? "ON_DUTY" : "OFF_DUTY";

    return {
      success: true,
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        designation: employee.designation,
      },
      isOnDuty,
      isOnLeave: Boolean(activeLeave),
      dutyStatus,
      todayDurationMinutes: totalDurationTodayMinutes,
      todaySessionsCount: todaySessions.length,
      activeLeave: activeLeave
        ? {
            id: activeLeave.id,
            startDate: formatDateIST(activeLeave.startDate),
            endDate: formatDateIST(activeLeave.endDate),
            reason: activeLeave.reason,
          }
        : null,
      activeSession: activeSessionDisplay,
      todayStats: {
        sessionsCount: todaySessions.length,
        totalDurationMinutes: totalDurationTodayMinutes,
        totalDurationDisplay: formatDurationHours(totalDurationTodayMinutes),
      },
    };
  }

  /**
   * Starts a new duty session for the employee.
   * Safe transaction: ensures no duplicate active sessions exist.
   */
  static async startDuty(params: StartDutyParams) {
    const employee = await activeDb.employee.findUnique({
      where: { id: params.employeeId },
    });
    if (!employee) throw new Error("Employee not found.");

    // Check if employee already has an active session
    const existing = await activeDb.dutySession.findFirst({
      where: {
        employeeId: params.employeeId,
        status: "ON_DUTY",
      },
    });

    if (existing) {
      // Idempotency: return existing active session without failing or creating duplicate
      return {
        success: true,
        alreadyActive: true,
        session: existing,
        message: "Employee is already ON DUTY.",
      };
    }

    const now = new Date();
    const newSession = await activeDb.dutySession.create({
      data: {
        employeeId: params.employeeId,
        startTime: now,
        status: "ON_DUTY",
        startLatitude: params.latitude || null,
        startLongitude: params.longitude || null,
        notes: params.notes || null,
      },
    });

    const status = await this.getDutyStatus(params.employeeId);
    return {
      success: true,
      alreadyActive: false,
      session: newSession,
      status,
    };
  }

  /**
   * Ends the currently active duty session.
   * Calculates duration in minutes and stores completion details.
   */
  static async endDuty(params: EndDutyParams) {
    const activeSession = await activeDb.dutySession.findFirst({
      where: {
        employeeId: params.employeeId,
        status: "ON_DUTY",
      },
      orderBy: { startTime: "desc" },
    });

    if (!activeSession) {
      throw new Error("No active ON DUTY session found for this employee.");
    }

    const now = new Date();
    const diffMs = now.getTime() - activeSession.startTime.getTime();
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

    const updated = await activeDb.dutySession.update({
      where: { id: activeSession.id },
      data: {
        endTime: now,
        durationMinutes,
        status: "COMPLETED",
        endLatitude: params.latitude || null,
        endLongitude: params.longitude || null,
        notes: params.notes ? `${activeSession.notes || ""}\n${params.notes}`.trim() : activeSession.notes,
      },
    });

    const status = await this.getDutyStatus(params.employeeId);
    return {
      success: true,
      session: updated,
      status,
    };
  }

  /**
   * Fetches detailed attendance sessions for a specific employee across a date range.
   */
  static async getEmployeeAttendanceHistory(employeeId: string, options?: { startDate?: Date; endDate?: Date }) {
    const employee = await activeDb.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new Error("Employee not found.");

    const where: any = { employeeId };
    if (options?.startDate || options?.endDate) {
      where.startTime = {};
      if (options.startDate) where.startTime.gte = options.startDate;
      if (options.endDate) where.startTime.lte = options.endDate;
    }

    const sessions = await activeDb.dutySession.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: {
        corrections: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return {
      success: true,
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        designation: employee.designation,
      },
      sessions: sessions.map((s: any) => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime ? s.endTime.toISOString() : null,
        startTimeDisplay: formatTime12HourIST(s.startTime),
        endTimeDisplay: s.endTime ? formatTime12HourIST(s.endTime) : "Active",
        dateDisplay: formatDateIST(s.startTime),
        durationMinutes: s.durationMinutes || (s.status === "ON_DUTY" ? Math.round((Date.now() - s.startTime.getTime()) / 60000) : 0),
        durationDisplay: formatDurationHours(s.durationMinutes || (s.status === "ON_DUTY" ? Math.round((Date.now() - s.startTime.getTime()) / 60000) : 0)),
        status: s.status,
        notes: s.notes,
        correctionsCount: s.corrections.length,
        corrections: s.corrections,
      })),
    };
  }

  /**
   * Generates the comprehensive attendance roster for the Admin Portal.
   */
  static async getAttendanceRoster(date: Date = new Date(), search?: string) {
    const { startOfDayIST, endOfDayIST } = getISTDayBoundaries(date);
    const now = new Date();

    const employeeWhere: any = { status: "ACTIVE" };
    if (search && search.trim()) {
      const q = search.trim();
      employeeWhere.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
        { designation: { contains: q, mode: "insensitive" } },
      ];
    }

    const employees = await activeDb.employee.findMany({
      where: employeeWhere,
      orderBy: { firstName: "asc" },
      include: {
        dutySessions: {
          where: {
            OR: [
              { startTime: { gte: startOfDayIST, lte: endOfDayIST } },
              { status: "ON_DUTY" },
            ],
          },
          orderBy: { startTime: "asc" },
        },
        leaveRequests: {
          where: {
            status: "APPROVED",
            startDate: { lte: endOfDayIST },
            endDate: { gte: startOfDayIST },
          },
        },
      },
    });

    let onDutyCount = 0;
    let onLeaveCount = 0;
    let offDutyCount = 0;
    let totalSessionsToday = 0;

    const roster = employees.map((emp: any) => {
      // Filter sessions belonging specifically to the requested IST day boundary
      const daySessions = emp.dutySessions.filter(
        (s: any) => s.startTime >= startOfDayIST && s.startTime <= endOfDayIST
      );
      totalSessionsToday += daySessions.length;

      // Real-time duty status: if employee has ANY active ON_DUTY session, they are ON_DUTY
      const activeSession = emp.dutySessions.find((s: any) => s.status === "ON_DUTY");
      const isApprovedLeave = emp.leaveRequests.length > 0;

      let dutyStatus = "OFF_DUTY";
      if (activeSession) {
        dutyStatus = "ON_DUTY";
        onDutyCount++;
      } else if (isApprovedLeave) {
        dutyStatus = "ON_LEAVE";
        onLeaveCount++;
      } else {
        offDutyCount++;
      }

      // Calculate accumulated duration for today (including active session minutes)
      let totalMinutes = 0;
      for (const s of daySessions) {
        if (s.status === "COMPLETED" && s.durationMinutes) {
          totalMinutes += s.durationMinutes;
        } else if (s.status === "ON_DUTY") {
          totalMinutes += Math.max(0, Math.round((now.getTime() - s.startTime.getTime()) / 60000));
        }
      }
      // If there is an active session started prior to today's boundary, add its active duration
      if (activeSession && !daySessions.some((s: any) => s.id === activeSession.id)) {
        totalMinutes += Math.max(0, Math.round((now.getTime() - activeSession.startTime.getTime()) / 60000));
      }

      const sessionsToDisplay = daySessions.length > 0 ? daySessions : (activeSession ? [activeSession] : []);
      const firstSession = sessionsToDisplay[0];
      const lastSession = sessionsToDisplay[sessionsToDisplay.length - 1];

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        designation: emp.designation,
        dutyStatus, // "ON_DUTY", "OFF_DUTY", "ON_LEAVE"
        dutyStartDisplay: firstSession ? formatTime12HourIST(firstSession.startTime) : "—",
        dutyEndDisplay: lastSession && lastSession.endTime ? formatTime12HourIST(lastSession.endTime) : (activeSession ? "Ongoing" : "—"),
        totalMinutes,
        totalHoursDisplay: formatDurationHours(totalMinutes),
        sessionsCount: daySessions.length,
        sessions: sessionsToDisplay.map((s: any) => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime ? s.endTime.toISOString() : null,
          startTimeDisplay: formatTime12HourIST(s.startTime),
          endTimeDisplay: s.endTime ? formatTime12HourIST(s.endTime) : "Active",
          durationMinutes: s.durationMinutes || Math.round((now.getTime() - s.startTime.getTime()) / 60000),
          durationDisplay: formatDurationHours(s.durationMinutes || Math.round((now.getTime() - s.startTime.getTime()) / 60000)),
          status: s.status,
        })),
      };
    });

    const metrics = {
      totalEmployees: employees.length,
      onDuty: onDutyCount,
      offDuty: offDutyCount,
      onLeave: onLeaveCount,
      totalSessionsToday,
    };

    return {
      success: true,
      date: formatDateIST(date),
      dateFormatted: formatDateIST(date),
      summary: {
        totalEmployees: employees.length,
        onDutyCount,
        offDutyCount,
        onLeaveCount,
        totalSessionsToday,
      },
      metrics,
      roster,
    };
  }

  /**
   * Audited manual correction of attendance by an authorized administrator.
   */
  static async recordCorrection(params: CorrectionParams) {
    const session = params.dutySessionId
      ? await activeDb.dutySession.findUnique({ where: { id: params.dutySessionId } })
      : null;

    const previousState = session
      ? JSON.stringify({
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes: session.durationMinutes,
          status: session.status,
        })
      : "NEW_SESSION_MANUALLY_CREATED";

    let targetSessionId = params.dutySessionId;

    if (session) {
      const newDuration = params.endTime && params.startTime
        ? Math.max(1, Math.round((params.endTime.getTime() - params.startTime.getTime()) / 60000))
        : session.durationMinutes;

      await activeDb.dutySession.update({
        where: { id: session.id },
        data: {
          startTime: params.startTime || session.startTime,
          endTime: params.endTime || session.endTime,
          durationMinutes: newDuration,
          status: params.status || session.status,
        },
      });
    } else {
      // Create manually inserted duty session
      const created = await activeDb.dutySession.create({
        data: {
          employeeId: params.employeeId,
          startTime: params.startTime || new Date(),
          endTime: params.endTime || new Date(),
          durationMinutes: params.startTime && params.endTime
            ? Math.max(1, Math.round((params.endTime.getTime() - params.startTime.getTime()) / 60000))
            : 0,
          status: params.status || "COMPLETED",
          notes: `Manually added by administrator: ${params.reason}`,
        },
      });
      targetSessionId = created.id;
    }

    const newState = JSON.stringify({
      startTime: params.startTime,
      endTime: params.endTime,
      status: params.status,
      reason: params.reason,
    });

    // Write audit log
    await activeDb.attendanceCorrectionLog.create({
      data: {
        dutySessionId: targetSessionId || null,
        employeeId: params.employeeId,
        adminUserId: params.adminUserId,
        adminEmail: params.adminEmail,
        reason: params.reason,
        previousState,
        newState,
      },
    });

    return { success: true };
  }
}
