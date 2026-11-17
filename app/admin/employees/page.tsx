import { EmployeesClient } from "./EmployeesClient";
import { AdminUserService } from "@/lib/services/admin-users";
import { requireAuth } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employee & Admin Management - Sunshine Eldercare",
};

export default async function EmployeesPage() {
  const user = await requireAuth();
  const isOwner = user.email === "info.sunshineeldercare@gmail.com";

  const canManageAdmins = isOwner || (await AuthorizationService.can(user.id, "ADMIN_USER_MANAGE", user.email));
  const canViewAdmins = isOwner || canManageAdmins || (await AuthorizationService.can(user.id, "ADMIN_USER_VIEW", user.email));
  const canViewEmployees = isOwner || (await AuthorizationService.can(user.id, "EMPLOYEE_VIEW", user.email));
  const canCreateEmployee = isOwner || (await AuthorizationService.can(user.id, "EMPLOYEE_CREATE", user.email));
  const canEditEmployee = isOwner || (await AuthorizationService.can(user.id, "EMPLOYEE_EDIT", user.email));
  const canDeactivateEmployee = isOwner || (await AuthorizationService.can(user.id, "EMPLOYEE_DEACTIVATE", user.email));

  if (!isOwner && !canViewEmployees && !canViewAdmins && !canCreateEmployee) {
    redirect("/admin");
  }

  let users: any = [];
  let invitations: any = [];
  let invitationError = false;

  if (canViewAdmins) {
    try {
      users = await AdminUserService.getEmployeeUsers(user.id);
    } catch (e) {
      console.error("Error fetching admin users:", e);
    }

    try {
      invitations = await AdminUserService.getAdminInvitations(user.id);
    } catch (error: any) {
      if (error.code === "P2021") {
        invitationError = true;
        console.error("AdminInvitation table missing - skipping invitations query.");
      } else {
        throw error;
      }
    }
  }

  const [roles, employees] = await Promise.all([
    db.role.findMany({ orderBy: { name: "asc" } }),
    db.employee.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Employee & Admin Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage operational care staff, caregivers, administrative access accounts, and role permissions.
        </p>
      </div>

      <EmployeesClient
        initialUsers={users}
        initialInvitations={invitations}
        invitationError={invitationError}
        roles={roles}
        initialEmployees={employees}
        permissions={{
          isOwner,
          canManageAdmins,
          canViewAdmins,
          canViewEmployees,
          canCreateEmployee,
          canEditEmployee,
          canDeactivateEmployee,
        }}
      />
    </div>
  );
}
