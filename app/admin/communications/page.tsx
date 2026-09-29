"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Save, AlertCircle } from "lucide-react";

// List of built-in templates
const BUILT_IN_TEMPLATES = [
  { code: 'RENEWAL_SUBMITTED', name: 'Renewal Submitted (Member)', defaultSubject: 'Your Renewal Request is Submitted' },
  { code: 'ADMIN_NEW_RENEWAL', name: 'New Renewal (Admin)', defaultSubject: 'New Renewal Request' },
  { code: 'RENEWAL_APPROVED', name: 'Renewal Approved', defaultSubject: 'Your Renewal is Approved' },
  { code: 'RENEWAL_REJECTED', name: 'Renewal Rejected', defaultSubject: 'Update on Your Renewal Request' },
  { code: 'PAYMENT_SUBMITTED', name: 'Payment Submitted (Member)', defaultSubject: 'Payment Received - Pending Verification' },
  { code: 'ADMIN_PAYMENT_SUBMITTED', name: 'New Payment (Admin)', defaultSubject: 'New Payment Submitted' },
  { code: 'PAYMENT_VERIFIED', name: 'Payment Verified', defaultSubject: 'Payment Verified Successfully' },
  { code: 'MEMBERSHIP_ACTIVATED', name: 'Membership Activated', defaultSubject: 'Your Membership is Active' },
  { code: 'MEMBERSHIP_SCHEDULED', name: 'Membership Scheduled', defaultSubject: 'Your Membership is Scheduled' },
  { code: 'PAYMENT_REJECTED', name: 'Payment Rejected', defaultSubject: 'Update on Your Payment' },
  { code: 'ADMIN_INQUIRY_RECEIVED', name: 'New Inquiry (Admin)', defaultSubject: 'New Website Inquiry' },
];

export default function CommunicationsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = ({ title, description, variant }: any) => { alert(`${title}\n${description || ''}`); };

  const [formData, setFormData] = useState({
    subject: "",
    body: "",
    isActive: true,
    description: "",
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/communications/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    const existing = templates.find((t) => t.code === code);
    if (existing) {
      setFormData({
        subject: existing.subject,
        body: existing.body,
        isActive: existing.isActive,
        description: existing.description || "",
      });
    } else {
      const builtIn = BUILT_IN_TEMPLATES.find((t) => t.code === code);
      setFormData({
        subject: builtIn?.defaultSubject || "",
        body: "Hello {{memberName}},\n\nHere is your message...",
        isActive: true,
        description: "",
      });
    }
  };

  const handleSave = async () => {
    if (!selectedCode) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/communications/templates/${selectedCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: "Template saved successfully" });
        fetchTemplates();
      } else {
        const data = await res.json();
        toast({ title: "Error saving template", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error saving template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email Templates</h1>
        <p className="text-slate-500 mt-2">Manage automated email notifications sent to members and administrators.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-semibold">Template Library</h3>
            </div>
            <div className="p-0">
              <div className="divide-y">
                {BUILT_IN_TEMPLATES.map((bt) => {
                  const isOverridden = templates.some(t => t.code === bt.code && t.isActive);
                  return (
                    <button
                      key={bt.code}
                      onClick={() => handleSelect(bt.code)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedCode === bt.code ? 'bg-slate-50 border-l-4 border-primary' : ''}`}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{bt.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{bt.code}</div>
                      </div>
                      {isOverridden ? (
                        <span className="text-[10px] font-semibold tracking-wider bg-green-100 text-green-700 px-2 py-1 rounded-full">CUSTOM</span>
                      ) : (
                        <span className="text-[10px] font-semibold tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-full">DEFAULT</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {selectedCode ? (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Edit Template</h3>
                    <p className="text-sm text-slate-500">{BUILT_IN_TEMPLATES.find(t => t.code === selectedCode)?.name} ({selectedCode})</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="isActive" className="text-sm font-medium">Use Custom Template</label>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0 space-y-6">
                {!formData.isActive && (
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">System Default Active</h4>
                      <p className="text-sm mt-1">This custom template is currently disabled. The system will fall back to the hardcoded default template.</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Subject</label>
                  <input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Enter email subject"
                    disabled={!formData.isActive}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Body (HTML/Text)</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Enter email content..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[300px] font-mono text-sm"
                    disabled={!formData.isActive}
                  />
                  <p className="text-xs text-slate-500">
                    Use {'{{propertyName}}'} for dynamic variables (e.g., {'{{memberName}}'}, {'{{planName}}'}).
                    The content is automatically wrapped in the Sunshine Eldercare layout. You can use standard HTML tags like &lt;br/&gt;, &lt;strong&gt;, etc.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSave} disabled={saving || !formData.isActive} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-900/90 h-10 px-4 py-2">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
              <Mail className="w-12 h-12 mb-4 text-slate-300" />
              <p>Select a template from the library to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
