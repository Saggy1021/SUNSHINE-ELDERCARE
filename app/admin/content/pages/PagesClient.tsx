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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Website Pages</h1>
        {canManage && (
          <button onClick={handleNew} className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Page
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-semibold">{editing.id ? 'Edit Page' : 'New Page'}</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
              <input required disabled={!!editing.id} type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full border rounded-md p-2 disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-md p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-32 border rounded-md p-2">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Structured Content (JSON/Text)</label>
            <textarea rows={6} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border rounded-md p-2 font-mono text-sm" />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-md font-medium mb-4">SEO Metadata</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SEO Title</label>
                <input type="text" value={seoData.title} onChange={e => setSeoData({...seoData, title: e.target.value})} className="w-full border rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta Description</label>
                <textarea rows={2} value={seoData.description} onChange={e => setSeoData({...seoData, description: e.target.value})} className="w-full border rounded-md p-2" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="noIndex" checked={seoData.noIndex} onChange={e => setSeoData({...seoData, noIndex: e.target.checked})} />
                <label htmlFor="noIndex" className="text-sm font-medium text-slate-700">No Index (Hide from search engines)</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Updated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pages.map(page => (
              <tr key={page.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{page.slug}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{page.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    page.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                    page.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {page.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(page.updatedAt).toLocaleDateString()}
                  {page.updatedBy && <span className="block text-xs">by {page.updatedBy.name}</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManage && (
                    <button onClick={() => handleEdit(page)} className="text-amber-600 hover:text-amber-900">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No pages found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
