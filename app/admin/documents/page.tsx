"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, Upload, FileText } from "lucide-react";

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const toast = ({ title, description, variant }: any) => { alert(`${title}\n${description || ''}`); };

  const [formData, setFormData] = useState({
    userId: "",
    documentType: "CONTRACT",
    file: null as File | null,
  });

  const fetchData = async () => {
    try {
      const [docRes, memRes] = await Promise.all([
        fetch("/api/admin/documents"),
        fetch("/api/admin/users?role=Member")
      ]);
      
      if (docRes.ok) setDocuments(await docRes.json());
      if (memRes.ok) setMembers(await memRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.file || !formData.documentType) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append("userId", formData.userId);
    data.append("documentType", formData.documentType);
    data.append("file", formData.file);

    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        toast({ title: "Document uploaded successfully" });
        setFormData({ ...formData, file: null });
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "Error uploading", description: err.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#091329] mb-2" />
        <span className="text-sm">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Member Documents</h1>
        <p className="text-sm text-slate-500 mt-1">Securely upload and manage private documents and contracts for members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-semibold text-slate-900">Upload Document</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Member *</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329] transition-all"
                  >
                    <option value="" disabled>Select member</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Document Type *</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329] transition-all"
                  >
                    <option value="CONTRACT">Contract</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">File *</label>
                  <input 
                    type="file" 
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    key={formData.file ? 'has-file' : 'no-file'}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-[#091329] text-white hover:bg-[#162850] h-10 px-4 py-2 shadow-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Document
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Document Repository</h3>
              <span className="text-xs font-medium text-slate-500">{documents.length} files</span>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-slate-50/60 rounded-lg border border-slate-100">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    No documents have been uploaded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                        <div className="min-w-0 pr-4">
                          <div className="font-medium text-slate-900 text-sm truncate">{doc.displayName}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>{doc.user?.name || doc.user?.email}</span>
                            <span>•</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                              {doc.documentType}
                            </span>
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString('en-GB')}</span>
                          </div>
                        </div>
                        <a 
                          href={`/api/documents/download?docId=${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download document"
                        >
                          <button className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors text-slate-600 hover:text-[#091329] hover:bg-slate-100 h-9 px-3 border border-slate-200 shadow-2xs">
                            <Download className="w-4 h-4" />
                          </button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
