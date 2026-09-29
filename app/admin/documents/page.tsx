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
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Member Documents</h1>
        <p className="text-slate-500 mt-2">Securely upload and manage private documents for members.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-1">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-semibold">Upload Document</h3>
            </div>
            <div className="p-6 pt-0">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select member</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Type</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="CONTRACT">Contract</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">File</label>
                  <input 
                    type="file" 
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    key={formData.file ? 'has-file' : 'no-file'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <button type="submit" disabled={uploading} className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-900/90 h-10 px-4 py-2">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Document
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-semibold">Document Repository</h3>
            </div>
            <div className="p-6 pt-0">
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    No documents have been uploaded yet.
                  </div>
                ) : (
                  <div className="divide-y border rounded-md">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-medium text-slate-900">{doc.displayName}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {doc.user?.name} ({doc.user?.email}) • {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <a 
                          href={`/api/documents/download?docId=${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 h-9 px-3">
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
