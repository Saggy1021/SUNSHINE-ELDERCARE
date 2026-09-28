'use client';

import { useState } from 'react';
import { upsertSetting } from '@/app/actions/cms';
import { Edit2, Plus, AlertCircle } from 'lucide-react';

export default function SettingsClient({ initialSettings, canManage }: { initialSettings: any[], canManage: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (setting: any) => {
    setEditing(setting);
    setFormData({ key: setting.key, value: setting.value, description: setting.description || '' });
  };

  const handleNew = () => {
    setEditing({});
    setFormData({ key: '', value: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await upsertSetting(formData.key, formData.value, formData.description);
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
        <h1 className="text-2xl font-bold">Manage Website Settings</h1>
        {canManage && (
          <button onClick={handleNew} className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Setting
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold">{editing.id ? 'Edit Setting' : 'New Setting'}</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Key</label>
            <input required disabled={!!editing.id} type="text" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="w-full border rounded-md p-2 disabled:bg-slate-100" />
            <p className="text-xs text-slate-500 mt-1">e.g., public_phone, public_email, footer_text</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
            <textarea required rows={3} value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full border rounded-md p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Internal)</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-md p-2" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Setting'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {settings.map(setting => (
              <tr key={setting.key} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{setting.key}</td>
                <td className="px-6 py-4 text-sm text-slate-700 max-w-md truncate">{setting.value}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{setting.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManage && (
                    <button onClick={() => handleEdit(setting)} className="text-amber-600 hover:text-amber-900">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {settings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No settings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
