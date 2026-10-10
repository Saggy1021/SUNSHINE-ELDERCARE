"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

export async function createCareOperation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  await AuthorizationService.require(session.user.id, PERMISSIONS.CARE_CASE_MANAGE);

  const careCaseId = formData.get("careCaseId") as string;
  const description = formData.get("description") as string;
  const date = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const employeeIdsStr = formData.get("employeeIds") as string; // JSON array of string ids

  if (!careCaseId || !description || !date || !startTime || !endTime || !employeeIdsStr) {
    throw new Error("Missing required fields.");
  }

  const employeeIds: string[] = JSON.parse(employeeIdsStr);

  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);

  const operation = await db.careVisit.create({
    data: {
      careCaseId,
      operationalNotes: description,
      scheduledStart: start,
      scheduledEnd: end,
      createdById: session.user.id,
      assignments: {
        create: employeeIds.map(empId => ({
          employeeId: empId
        }))
      }
    }
  });

  revalidatePath("/admin/care");
  revalidatePath("/admin/care/operations");
  return { success: true, operationId: operation.id };
}

export async function getCareOperations() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await AuthorizationService.require(session.user.id, PERMISSIONS.CARE_CASE_VIEW);

  return db.careVisit.findMany({
    orderBy: { scheduledStart: "desc" },
    include: {
      careCase: {
        include: {
          elder: { include: { user: true } }
        }
      },
      assignments: {
        include: { employee: true }
      }
    }
  });
}
