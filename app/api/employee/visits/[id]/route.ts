import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";
import {
  careVisitEmployeeIncludes,
  formatEmployeeVisit,
} from "@/lib/services/employee-visit-formatter";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedEmployee(req);
    if (!authResult.authenticated || !authResult.employee) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const { id } = await params;
    const employee = authResult.employee;

    const visit = await db.careVisit.findUnique({
      where: { id },
      include: careVisitEmployeeIncludes,
    });

    if (!visit) {
      return NextResponse.json(
        { success: false, error: "Visit not found." },
        { status: 404 }
      );
    }

    // STRICT OWNER CHECK: Is this visit assigned to the authenticated employee?
    const isAssigned =
      visit.assignedEmpId === employee.id ||
      visit.assignments.some((a: any) => a.employeeId === employee.id);

    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: "Access denied. This visit is not assigned to you." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      visit: formatEmployeeVisit(visit),
    });
  } catch (error: any) {
    console.error("[get-employee-visit-detail] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
