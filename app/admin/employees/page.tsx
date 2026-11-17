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

  let canManageAdmins = isOwner;
  let canViewAdmins = isOwner;
  let canViewEmployees = isOwner;
  let canCreateEmployee = isOwner;
  let canEditEmployee = isOwner;
  let canDeactivateEmployee = isOwner;

  if (!isOwner) {
    const userPerms = await AuthorizationService.getUserPermissions(user.id);
    canManageAdmins = userPerms.has("ADMIN_USER_MANAGE");
    canViewAdmins = canManageAdmins || userPerms.has("ADMIN_USER_VIEW");
    canViewEmployees = userPerms.has("EMPLOYEE_VIEW");
    canCreateEmployee = userPerms.has("EMPLOYEE_CREATE");
    canEditEmployee = userPerms.has("EMPLOYEE_EDIT");
    canDeactivateEmployee = userPerms.has("EMPLOYEE_DEACTIVATE");
  }

  if (!isOwner && !canViewEmployees && !canViewAdmins && !canCreateEmployee) {
    redirect("/admin");
  }

  // Execute all admin users, invitations, roles, and employees queries in parallel
  const [usersResult, invitationsResult, roles, employees] = await Promise.all([
    canViewAdmins
      ? AdminUserService.getEmployeeUsers(user.id, user.email).catch((e) => {
          console.error("Error fetching admin users:", e);
          return [];
        })
      : Promise.resolve([]),
    canViewAdmins
      ? AdminUserService.getAdminInvitations(user.id, user.email)
          .then((invs) => ({ invitations: invs, invitationError: false }))
          .catch((error: any) => {
            if (error?.code === "P2021") {
              console.error("AdminInvitation table missing - skipping invitations query.");
              return { invitations: [], invitationError: true };
            }
            throw error;
          })
      : Promise.resolve({ invitations: [], invitationError: false }),
    db.role.findMany({ orderBy: { name: "asc" } }),
    db.employee.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const users = usersResult || [];
  const invitations = invitationsResult.invitations || [];
  const invitationError = invitationsResult.invitationError || false;

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
