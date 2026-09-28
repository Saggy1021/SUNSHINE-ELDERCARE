"use client";

import { useState } from "react";
import { Plus, Edit2, Shield, Users } from "lucide-react";
import { createRoleAction, updateRoleAction } from "@/app/actions/roles";
import { useRouter } from "next/navigation";

export function RolesClient({ initialRoles, allPermissions }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await createRoleAction(new FormData(e.currentTarget));
      setIsCreating(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingRole) return;
    setLoading(true);
    try {
      await updateRoleAction(editingRole.id, new FormData(e.currentTarget));
      setEditingRole(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  }

  // Group permissions by prefix (e.g. USER_VIEW -> USER)
  const groupedPermissions: Record<string, any[]> = {};
  for (const p of allPermissions) {
    const group = p.code.split('_')[0];
    if (!groupedPermissions[group]) groupedPermissions[group] = [];
    groupedPermissions[group].push(p);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-800">System Roles</h2>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialRoles.map((role: any) => (
          <div key={role.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {role.name}
                  {role.isSystem && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase tracking-wider">System</span>
                  )}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{role.description || 'No description provided.'}</p>
              </div>
              <button 
                onClick={() => setEditingRole(role)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-slate-50 hover:bg-slate-100"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-fit">
              <Users className="h-4 w-4" />
              <span className="font-medium">{role._count.users}</span> assigned users
            </div>

            <div className="mt-6 flex-1">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Permissions ({role.permissions.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.slice(0, 8).map((rp: any) => (
                  <span key={rp.permissionId} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-medium border border-slate-200">
                    {rp.permission.code}
                  </span>
                ))}
                {role.permissions.length > 8 && (
                  <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[11px] font-medium border border-slate-200 border-dashed">
                    +{role.permissions.length - 8} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(isCreating || editingRole) && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto py-10">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 my-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              {isCreating ? 'Create New Role' : `Edit Role: ${editingRole.name}`}
            </h3>
            <form onSubmit={isCreating ? handleCreate : handleUpdate} className="space-y-6">
              {isCreating && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                  <input name="name" required className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. Care Manager" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingRole?.description || ""}
                  className="w-full px-3 py-2 border rounded-lg h-20" 
                  placeholder="Describe the purpose of this role..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Permissions</label>
                <div className="bg-slate-50 border rounded-xl p-4 max-h-[40vh] overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group} className="mb-6 last:mb-0">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{group}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {perms.map(p => {
                          const hasPerm = editingRole?.permissions.some((rp: any) => rp.permissionId === p.id);
                          return (
                            <label key={p.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300">
                              <input 
                                type="checkbox" 
                                name="permissionCodes" 
                                value={p.code} 
                                defaultChecked={hasPerm}
                                className="mt-1"
                              />
                              <div>
                                <div className="text-sm font-medium text-slate-800 break-all">{p.code}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setIsCreating(false); setEditingRole(null); }} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isCreating ? 'Create Role' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
