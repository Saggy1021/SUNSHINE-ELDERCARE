'use client';

import { useState } from 'react';
import { createPage, updatePage } from '@/app/actions/cms';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

export default function PagesClient({ initialPages, canManage }: { initialPages: any[], canManage: boolean }) {
  const [pages, setPages] = useState(initialPages);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ slug: '', title: '', status: 'DRAFT', content: '' });
  const [seoData, setSeoData] = useState({ title: '', description: '', noIndex: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (page: any) => {
    setEditing(page);
    setFormData({ 
      slug: page.slug, 
      title: page.title, 
      status: page.status, 
      content: typeof page.content === 'string' ? page.content : JSON.stringify(page.content || '') 
    });
    setSeoData({
      title: page.seoMetadata?.title || '',
      description: page.seoMetadata?.description || '',
      noIndex: page.seoMetadata?.noIndex || false
    });
  };

  const handleNew = () => {
    setEditing({});
    setFormData({ slug: '', title: '', status: 'DRAFT', content: '' });
    setSeoData({ title: '', description: '', noIndex: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        slug: formData.slug,
        title: formData.title,
        status: formData.status,
        content: formData.content, // Treating content as JSON/structured string for now
        seo: {
          title: seoData.title,
          description: seoData.description,
          noIndex: seoData.noIndex
        }
      };

      if (editing?.id) {
        await updatePage(editing.id, payload);
      } else {
        await createPage(payload);
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
            <span className="text-slate-800 font-medium">Pages</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Manage Website Pages</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and maintain public static and landing page content and SEO metadata.</p>
        </div>
        {canManage && (
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#B08A4A]" /> Add Page
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/90 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#091329]">{editing.id ? 'Edit Page' : 'New Page'}</h2>
            <span className="text-xs text-slate-400 font-mono">{editing.id ? `ID: ${editing.id}` : 'New Record'}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Slug</label>
              <input required disabled={!!editing.id} type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none disabled:bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Title</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-40 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none bg-white">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Structured Content (JSON/Text)</label>
            <textarea rows={6} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 font-mono text-xs focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-[#091329] mb-3">SEO Metadata</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">SEO Title</label>
                <input type="text" value={seoData.title} onChange={e => setSeoData({...seoData, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Meta Description</label>
                <textarea rows={2} value={seoData.description} onChange={e => setSeoData({...seoData, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-[#B08A4A] focus:ring-1 focus:ring-[#B08A4A] outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="noIndex" checked={seoData.noIndex} onChange={e => setSeoData({...seoData, noIndex: e.target.checked})} className="rounded text-[#091329] focus:ring-[#B08A4A]" />
                <label htmlFor="noIndex" className="text-xs font-medium text-slate-700">No Index (Hide from search engines)</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Slug</th>
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Updated</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map(page => (
                <tr key={page.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-[#091329]">/{page.slug}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-slate-800">{page.title}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      page.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      page.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {page.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                    {new Date(page.updatedAt).toLocaleDateString()}
                    {page.updatedBy && <span className="block text-[11px] text-slate-400">by {page.updatedBy.name}</span>}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                    {canManage && (
                      <button onClick={() => handleEdit(page)} className="p-1.5 text-slate-400 hover:text-[#B08A4A] rounded hover:bg-slate-100 transition-colors" title="Edit Page">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No pages found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
