"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Shield, Lock, Activity, UserX, Search } from "lucide-react";
import { inviteAdminUserAction, updateAdminUserAction, toggleAdminStatusAction, resetAdminPasswordAction, revokeAdminInvitationAction } from "@/app/actions/admin-users";
import { useRouter } from "next/navigation";

export function EmployeesClient({ initialUsers, initialInvitations, roles, employees }: any) {
  const invitations = initialInvitations;
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  
  const router = useRouter();

  // Filter and sort users client-side since this list is typically small
  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user: any) => {
      const matchesSearch = !searchQuery || 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesRole = !roleFilter || 
        user.userRoles.some((ur: any) => ur.roleId === roleFilter);
        
      return matchesSearch && matchesRole;
    }).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [initialUsers, searchQuery, roleFilter]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await inviteAdminUserAction(new FormData(e.currentTarget));
      setIsCreating(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleRevoke(invId: string) {
    if (!confirm('Revoke this invitation?')) return;
    setLoading(true);
    try {
      await revokeAdminInvitationAction(invId);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      await updateAdminUserAction(editingUser.id, new FormData(e.currentTarget));
      setEditingUser(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleToggleStatus(user: any) {
    if (!confirm(`Are you sure you want to ${user.status === 'ACTIVE' ? 'deactivate' : 'activate'} this admin?`)) return;
    setLoading(true);
    try {
      await toggleAdminStatusAction(user.id, user.status);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordResetUser) return;
    setLoading(true);
    try {
      await resetAdminPasswordAction(passwordResetUser.id, new FormData(e.currentTarget));
      setPasswordResetUser(null);
      alert("Password reset successfully.");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold text-slate-800">Administrative Accounts</h2>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Admin
        </button>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-amber-50 text-amber-700 font-medium border-b border-amber-200">
              <tr>
                <th className="px-6 py-4">Invited Name & Email</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((inv: any) => {
                const roleIds = JSON.parse(inv.roleIds || '[]');
                const roleNames = roles.filter((r: any) => roleIds.includes(r.id)).map((r: any) => r.name);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{inv.name}</div>
                      <div className="text-slate-500 text-xs">{inv.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {roleNames.map((name: string) => (
                          <span key={name} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100">
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === 'PENDING' && (
                        <button onClick={() => handleRevoke(inv.id)} className="text-xs font-medium text-rose-600 hover:text-rose-800">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search admins by name/email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Roles</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-slate-500">
            {filteredUsers.length} admin{filteredUsers.length !== 1 ? 's' : ''}
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Admin Name</th>
              <th className="px-6 py-4">Roles</th>
              <th className="px-6 py-4">Employee Link</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No administrative users match your search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{user.name}</div>
                    <div className="text-slate-500 text-xs">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.map((ur: any) => (
                        <span key={ur.roleId} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100">
                          {ur.role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.employee ? (
                      <span className="text-slate-700">{user.employee.firstName} {user.employee.lastName}</span>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => setEditingUser(user)} className="text-slate-400 hover:text-indigo-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setPasswordResetUser(user)} className="text-slate-400 hover:text-amber-600">
                      <Lock className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleToggleStatus(user)} className="text-slate-400 hover:text-rose-600">
                      {user.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Invite Admin User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input name="name" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" name="email" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee Link (Optional)</label>
                <select name="employeeId" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">-- No Link --</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                  {roles.map((r: any) => (
                    <label key={r.id} className="flex items-center gap-2">
                      <input type="checkbox" name="roleIds" value={r.id} />
                      <span className="text-sm font-medium text-slate-700">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Admin: {editingUser.name}</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee Link (Optional)</label>
                <select name="employeeId" defaultValue={editingUser.employeeId || ""} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">-- No Link --</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                  {roles.map((r: any) => {
                    const hasRole = editingUser.userRoles.some((ur: any) => ur.roleId === r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2">
                        <input type="checkbox" name="roleIds" value={r.id} defaultChecked={hasRole} />
                        <span className="text-sm font-medium text-slate-700">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reset Password: {passwordResetUser.name}</h3>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input type="password" name="newPassword" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setPasswordResetUser(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
