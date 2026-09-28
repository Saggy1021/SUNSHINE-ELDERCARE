'use client';

import { useState } from 'react';
import { updateEmployeePublicProfile } from '@/app/actions/cms';
import { Edit2, AlertCircle } from 'lucide-react';

export default function EmployeesClient({ initialEmployees, canManage }: { initialEmployees: any[], canManage: boolean }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ isPublic: false, publicBiography: '', displayOrder: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (emp: any) => {
    setEditing(emp);
    setFormData({ isPublic: emp.isPublic, publicBiography: emp.publicBiography || '', displayOrder: emp.displayOrder || 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateEmployeePublicProfile(editing.id, formData);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Public Employee Profiles</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold">Edit Public Profile: {editing.firstName} {editing.lastName}</h2>
          
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublic" checked={formData.isPublic} onChange={e => setFormData({...formData, isPublic: e.target.checked})} />
            <label htmlFor="isPublic" className="font-medium text-slate-700">Make this profile public on the website</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Public Biography</label>
            <textarea rows={4} value={formData.publicBiography} onChange={e => setFormData({...formData, publicBiography: e.target.value})} className="w-full border rounded-md p-2" placeholder="Leave blank to use default designation..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
            <input required type="number" value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})} className="w-32 border rounded-md p-2" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Public</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {emp.firstName} {emp.lastName}
                  <span className="block text-xs text-slate-500">{emp.employeeId}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.designation}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {emp.isPublic ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Public</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Hidden</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.displayOrder}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManage && (
                    <button onClick={() => handleEdit(emp)} className="text-amber-600 hover:text-amber-900">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No active employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
