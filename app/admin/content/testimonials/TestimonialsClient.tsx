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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Testimonials</h1>
        {canManage && (
          <button onClick={handleNew} className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Testimonial
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
          <h2 className="text-lg font-semibold">{editing.id ? 'Edit Testimonial' : 'New Testimonial'}</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Author Name</label>
              <input required type="text" value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Author Title / Relation</label>
              <input type="text" value={formData.authorTitle} onChange={e => setFormData({...formData, authorTitle: e.target.value})} className="w-full border rounded-md p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quote</label>
            <textarea required rows={4} value={formData.quote} onChange={e => setFormData({...formData, quote: e.target.value})} className="w-full border rounded-md p-2" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-md p-2">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
              <input required type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
              <input required type="number" min="1" max="5" value={formData.rating} onChange={e => setFormData({...formData, rating: parseInt(e.target.value) || 5})} className="w-full border rounded-md p-2" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Testimonial'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quote snippet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {testimonials.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {t.authorName}
                  {t.authorTitle && <span className="block text-xs text-slate-500">{t.authorTitle}</span>}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">{t.quote}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                    t.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManage && (
                    <button onClick={() => handleEdit(t)} className="text-amber-600 hover:text-amber-900">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {testimonials.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No testimonials found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
