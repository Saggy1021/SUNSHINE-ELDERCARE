import { RolesClient } from "./RolesClient";
import { RoleService } from "@/lib/services/roles";
import { requireAuth } from "@/lib/auth/utils";
import { AuthorizationService } from "@/lib/services/authorization";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Roles - Sunshine Eldercare",
};

export default async function RolesPage() {
  const user = await requireAuth();
  const canManage = await AuthorizationService.can(user.id, 'ROLE_MANAGE');
  if (!canManage) {
    redirect("/admin");
  }

  const roles = await RoleService.getRoles(user.id);
  const permissions = await RoleService.getPermissions(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Roles & Permissions</h1>
        <p className="text-sm text-slate-500 mt-1">Manage role definitions, access controls, and permission assignments.</p>
      </div>
      <RolesClient initialRoles={roles} allPermissions={permissions} />
    </div>
  );
}
