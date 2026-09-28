import { AdminUsersClient } from "./AdminUsersClient";
import { AdminUserService } from "@/lib/services/admin-users";
import { requireAuth } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin Users - Sunshine Elder Care",
};

export default async function AdminUsersPage() {
  const user = await requireAuth();
  const isOwner = await AuthorizationService.isOwner(user.id);
  if (!isOwner) {
    redirect("/admin");
  }

  const users = await AdminUserService.getAdminUsers(user.id);
  const roles = await db.role.findMany({ orderBy: { name: 'asc' } });
  const employees = await db.employee.findMany({ orderBy: { lastName: 'asc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Users</h1>
        <p className="text-slate-500">Manage administrative access and assign roles.</p>
      </div>
      <AdminUsersClient initialUsers={users} roles={roles} employees={employees} />
    </div>
  );
}
