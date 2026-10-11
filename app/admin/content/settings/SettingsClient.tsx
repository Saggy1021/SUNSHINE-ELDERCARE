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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <a href="/admin" className="hover:text-[#B08A4A] transition-colors">Admin</a>
            <span>/</span>
            <a href="/admin/content" className="hover:text-[#B08A4A] transition-colors">Content</a>
            <span>/</span>
            <span className="text-slate-800 font-medium">Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Website Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage global parameters such as official contact info, email addresses, and footer text.</p>
        </div>
        {canManage && (
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#B08A4A]" /> Add Setting
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/90 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#091329]">{editing.id ? 'Edit Setting' : 'New Setting'}</h2>
            <span className="text-xs text-slate-400 font-mono">{editing.id ? `ID: ${editing.id}` : 'New Record'}</span>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Key</label>
            <input required disabled={!!editing.id} type="text" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none disabled:bg-slate-50 font-mono" />
            <p className="text-xs text-slate-400 mt-1">e.g., public_phone, public_email, footer_text</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Value</label>
            <textarea required rows={3} value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Description (Internal)</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save Setting'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Key</th>
                <th className="px-5 py-3.5">Value</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.map(setting => (
                <tr key={setting.key} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-[#091329]">{setting.key}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-800 max-w-md truncate">{setting.value}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{setting.description}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                    {canManage && (
                      <button onClick={() => handleEdit(setting)} className="p-1.5 text-slate-400 hover:text-[#B08A4A] rounded hover:bg-slate-100 transition-colors" title="Edit Setting">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {settings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No settings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
