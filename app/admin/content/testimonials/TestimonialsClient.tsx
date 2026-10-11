'use client';

import { useState } from 'react';
import { createTestimonial, updateTestimonial } from '@/app/actions/cms';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

export default function TestimonialsClient({ initialTestimonials, canManage }: { initialTestimonials: any[], canManage: boolean }) {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ authorName: '', authorTitle: '', quote: '', rating: 5, image: '', status: 'DRAFT', sortOrder: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (t: any) => {
    setEditing(t);
    setFormData({ authorName: t.authorName, authorTitle: t.authorTitle || '', quote: t.quote, rating: t.rating || 5, image: t.image || '', status: t.status, sortOrder: t.sortOrder });
  };

  const handleNew = () => {
    setEditing({});
    setFormData({ authorName: '', authorTitle: '', quote: '', rating: 5, image: '', status: 'DRAFT', sortOrder: testimonials.length });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing?.id) {
        await updateTestimonial(editing.id, formData);
      } else {
        await createTestimonial(formData);
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
            <span className="text-slate-800 font-medium">Testimonials</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Manage Testimonials</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage family reviews and quotes shown across the public website.</p>
        </div>
        {canManage && (
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#B08A4A]" /> Add Testimonial
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
            <h2 className="text-base font-semibold text-[#091329]">{editing.id ? 'Edit Testimonial' : 'New Testimonial'}</h2>
            <span className="text-xs text-slate-400 font-mono">{editing.id ? `ID: ${editing.id}` : 'New Record'}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Author Name</label>
              <input required type="text" value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Author Title / Relation</label>
              <input type="text" value={formData.authorTitle} onChange={e => setFormData({...formData, authorTitle: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Quote</label>
            <textarea required rows={4} value={formData.quote} onChange={e => setFormData({...formData, quote: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none bg-white">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Sort Order</label>
              <input required type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Rating (1-5)</label>
              <input required type="number" min="1" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: parseInt(e.target.value) || 5})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save Testimonial'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Author</th>
                <th className="px-5 py-3.5">Quote snippet</th>
                <th className="px-5 py-3.5">Rating</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {testimonials.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-slate-900">
                    {t.authorName}
                    {t.authorTitle && <span className="block text-xs text-slate-400 font-normal">{t.authorTitle}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 max-w-sm truncate italic">“{t.quote}”</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#B08A4A] font-semibold">
                    {'★'.repeat(t.rating || 5)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      t.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                    {canManage && (
                      <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-[#B08A4A] rounded hover:bg-slate-100 transition-colors" title="Edit Testimonial">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No testimonials found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
