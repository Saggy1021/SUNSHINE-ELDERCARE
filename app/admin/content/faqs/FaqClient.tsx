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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage FAQs</h1>
        {canManage && (
          <button onClick={handleNew} className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add FAQ
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
          <h2 className="text-lg font-semibold">{editing.id ? 'Edit FAQ' : 'New FAQ'}</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
            <input required type="text" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full border rounded-md p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Answer</label>
            <textarea required rows={4} value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full border rounded-md p-2" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-md p-2">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
              <input required type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} className="w-full border rounded-md p-2" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save FAQ'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {faqs.map(faq => (
              <tr key={faq.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{faq.sortOrder}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{faq.question}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    faq.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                    faq.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {faq.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManage && (
                    <button onClick={() => handleEdit(faq)} className="text-amber-600 hover:text-amber-900">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {faqs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No FAQs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
