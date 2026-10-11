import { EmployeesClient } from "./EmployeesClient";
import { AdminUserService } from "@/lib/services/admin-users";
import { requireAuth } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Employees - Sunshine Eldercare",
};

export default async function EmployeesPage() {
  const user = await requireAuth();
  const canManage = await AuthorizationService.can(user.id, 'ADMIN_USER_MANAGE');
  if (!canManage) {
    redirect("/admin");
  }

  const users = await AdminUserService.getEmployeeUsers(user.id);
  let invitations: any = [];
  let invitationError = false;
  try {
    invitations = await AdminUserService.getAdminInvitations(user.id);
  } catch (error: any) {
    if (error.code === 'P2021') {
      invitationError = true;
      console.error("AdminInvitation table missing - skipping invitations query.");
    } else {
      throw error;
    }
  }

  const roles = await db.role.findMany({ orderBy: { name: 'asc' } });
  const employees = await db.employee.findMany({ orderBy: { lastName: 'asc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Employees & Administrative Access</h1>
        <p className="text-sm text-slate-500 mt-1">Manage organizational staff, administrative access, and assign roles.</p>
      </div>
      <EmployeesClient initialUsers={users} initialInvitations={invitations} invitationError={invitationError} roles={roles} employees={employees} />
    </div>
  );
}
