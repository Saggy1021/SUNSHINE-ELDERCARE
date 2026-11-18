import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedEmployee } from "@/lib/auth/employee-auth";

export async function PATCH(
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
    const body = await req.json().catch(() => ({}));

    const visit = await db.careVisit.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!visit) {
      return NextResponse.json(
        { success: false, error: "Visit not found." },
        { status: 404 }
      );
    }

    const isAssigned =
      visit.assignedEmpId === employee.id ||
      visit.assignments.some((a) => a.employeeId === employee.id);

    if (!isAssigned) {
      return NextResponse.json(
        { success: false, error: "Access denied. You can only update visits assigned to you." },
        { status: 403 }
      );
    }

    const workDescription = typeof body.workDescription === "string" ? body.workDescription.trim() : "";

    const updated = await db.careVisit.update({
      where: { id },
      data: {
        workDescription: workDescription || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work description saved successfully.",
      workDescription: updated.workDescription,
    });
  } catch (error: any) {
    console.error("[update-work-description] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
