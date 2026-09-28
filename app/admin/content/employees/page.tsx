import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { db } from "@/lib/db";
import EmployeesClient from "./EmployeesClient";

export default async function AdminEmployeesContentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content/employees");

  try {
    await AuthorizationService.require(session.user.id, 'CONTENT_VIEW');
  } catch {
    redirect("/admin");
  }

  const canManage = await AuthorizationService.can(session.user.id, 'CONTENT_MANAGE');
  
  // Fetch all active employees
  const employees = await db.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [
      { isPublic: 'desc' },
      { displayOrder: 'asc' },
      { firstName: 'asc' }
    ]
  });

  return <EmployeesClient initialEmployees={employees} canManage={canManage} />;
}
