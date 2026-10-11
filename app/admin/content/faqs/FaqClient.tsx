'use client';

import { useState } from 'react';
import { createFaq, updateFaq } from '@/app/actions/cms';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

export default function FaqClient({ initialFaqs, canManage }: { initialFaqs: any[], canManage: boolean }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ question: '', answer: '', status: 'DRAFT', sortOrder: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (faq: any) => {
    setEditing(faq);
    setFormData({ question: faq.question, answer: faq.answer, status: faq.status, sortOrder: faq.sortOrder });
  };

  const handleNew = () => {
    setEditing({});
    setFormData({ question: '', answer: '', status: 'DRAFT', sortOrder: faqs.length });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing?.id) {
        await updateFaq(editing.id, formData);
      } else {
        await createFaq(formData);
      }
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
            <span className="text-slate-800 font-medium">FAQs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Manage FAQs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage frequently asked questions displayed on the public website.</p>
        </div>
        {canManage && (
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#B08A4A]" /> Add FAQ
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
            <h2 className="text-base font-semibold text-[#091329]">{editing.id ? 'Edit FAQ' : 'New FAQ'}</h2>
            <span className="text-xs text-slate-400 font-mono">{editing.id ? `ID: ${editing.id}` : 'New Record'}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Question</label>
            <input required type="text" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Answer</label>
            <textarea required rows={4} value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none bg-white">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Sort Order</label>
              <input required type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save FAQ'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Question</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faqs.map(faq => (
                <tr key={faq.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500">{faq.sortOrder}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{faq.question}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      faq.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      faq.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {faq.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                    {canManage && (
                      <button onClick={() => handleEdit(faq)} className="p-1.5 text-slate-400 hover:text-[#B08A4A] rounded hover:bg-slate-100 transition-colors" title="Edit FAQ">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {faqs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No FAQs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
