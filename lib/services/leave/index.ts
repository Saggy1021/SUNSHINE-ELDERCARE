import { db as prisma } from "@/lib/db";
import { formatDateIST } from "../duty";

let activeDb: any = prisma;

export function setLeaveDb(client: any) {
  activeDb = client;
}

export interface ApplyLeaveParams {
  employeeId: string;
  startDate: string | Date;
  endDate: string | Date;
  reason: string;
}

export interface ReviewLeaveParams {
  requestId: string;
  adminUserId: string;
  action: "APPROVE" | "REJECT" | "CANCEL";
  adminRemarks?: string;
}

export class LeaveService {
  /**
   * Submits a new leave request for an employee.
   */
  static async applyLeave(params: ApplyLeaveParams) {
    const employee = await activeDb.employee.findUnique({
      where: { id: params.employeeId },
    });
    if (!employee) throw new Error("Employee not found.");

    const parseISTDate = (input: string | Date, isEnd = false) => {
      if (typeof input === "string") {
        const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          const [_, y, m, d] = match;
          return isEnd
            ? new Date(`${y}-${m}-${d}T23:59:59.999+05:30`)
            : new Date(`${y}-${m}-${d}T00:00:00+05:30`);
        }
      }
      return new Date(input);
    };

    const start = parseISTDate(params.startDate, false);
    const end = parseISTDate(params.endDate, true);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid start or end date.");
    }

    if (start > end) {
      throw new Error("Leave start date cannot be after end date.");
    }

    // Check for overlapping approved or pending requests
    const overlap = await activeDb.employeeLeaveRequest.findFirst({
      where: {
        employeeId: params.employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlap) {
      throw new Error(
        `Leave request overlaps with an existing ${overlap.status.toLowerCase()} request (${formatDateIST(overlap.startDate)} – ${formatDateIST(overlap.endDate)}).`
      );
    }

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const created = await activeDb.employeeLeaveRequest.create({
      data: {
        employeeId: params.employeeId,
        startDate: start,
        endDate: end,
        totalDays: diffDays,
        reason: params.reason.trim(),
        status: "PENDING",
      },
    });

    return {
      success: true,
      request: created,
    };
  }

  /**
   * Fetches the leave history of an employee.
   */
  static async getEmployeeLeaveHistory(employeeId: string) {
    const requests = await activeDb.employeeLeaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      requests: requests.map((r: any) => ({
        id: r.id,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        startDateDisplay: formatDateIST(r.startDate),
        endDateDisplay: formatDateIST(r.endDate),
        totalDays: r.totalDays,
        reason: r.reason,
        status: r.status,
        adminRemarks: r.adminRemarks,
        appliedAt: r.createdAt.toISOString(),
        appliedAtDisplay: formatDateIST(r.createdAt),
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      })),
    };
  }

  /**
   * Retrieves all leave requests for administrator review.
   */
  static async getAdminLeaveRequests(
    optionsOrStatus?: string | { status?: string; employeeId?: string; limit?: number }
  ) {
    let statusFilter: string | undefined;
    let employeeId: string | undefined;
    let limit: number | undefined;

    if (typeof optionsOrStatus === "string") {
      statusFilter = optionsOrStatus;
    } else if (optionsOrStatus && typeof optionsOrStatus === "object") {
      statusFilter = optionsOrStatus.status;
      employeeId = optionsOrStatus.employeeId;
      limit = optionsOrStatus.limit;
    }

    const where: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const requests = await activeDb.employeeLeaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        employee: true,
      },
    });

    return {
      success: true,
      requests: requests.map((r: any) => ({
        id: r.id,
        employeeId: r.employee.id,
        employeeCode: r.employee.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
        designation: r.employee.designation,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        startDateDisplay: formatDateIST(r.startDate),
        endDateDisplay: formatDateIST(r.endDate),
        totalDays: r.totalDays,
        reason: r.reason,
        status: r.status,
        adminRemarks: r.adminRemarks,
        appliedAt: r.createdAt.toISOString(),
        appliedAtDisplay: formatDateIST(r.createdAt),
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      })),
    };
  }

  /**
   * Reviews and decisions a leave request (APPROVE, REJECT, CANCEL).
   */
  static async reviewLeaveRequest(params: ReviewLeaveParams) {
    const request = await activeDb.employeeLeaveRequest.findUnique({
      where: { id: params.requestId },
      include: { employee: true },
    });

    if (!request) throw new Error("Leave request not found.");

    let newStatus = "PENDING";
    if (params.action === "APPROVE") newStatus = "APPROVED";
    else if (params.action === "REJECT") newStatus = "REJECTED";
    else if (params.action === "CANCEL") newStatus = "CANCELLED";

    const updated = await activeDb.employeeLeaveRequest.update({
      where: { id: params.requestId },
      data: {
        status: newStatus,
        adminRemarks: params.adminRemarks ? params.adminRemarks.trim() : null,
        reviewedById: params.adminUserId,
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      request: updated,
    };
  }
}
