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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Communications</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage automated email notifications sent to members and administrators.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-muted/20">
              <h3 className="text-sm font-semibold text-[#091329] dark:text-white">Template Library</h3>
            </div>
            <div className="p-0">
              <div className="divide-y divide-border/40">
                {BUILT_IN_TEMPLATES.map((bt) => {
                  const isOverridden = templates.some(t => t.code === bt.code && t.isActive);
                  return (
                    <button
                      key={bt.code}
                      onClick={() => handleSelect(bt.code)}
                      className={`w-full text-left p-3.5 hover:bg-muted/50 transition-colors flex items-center justify-between ${selectedCode === bt.code ? 'bg-amber-500/10 border-l-4 border-[#B08A4A]' : ''}`}
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{bt.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">{bt.code}</div>
                      </div>
                      {isOverridden ? (
                        <span className="text-[10px] font-semibold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full">CUSTOM</span>
                      ) : (
                        <span className="text-[10px] font-semibold tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">DEFAULT</span>
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
            <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/40 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#091329] dark:text-white">Edit Template</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{BUILT_IN_TEMPLATES.find(t => t.code === selectedCode)?.name} (<span className="font-mono">{selectedCode}</span>)</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="isActive" className="text-xs font-medium text-foreground cursor-pointer">Use Custom Template</label>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-[#091329] accent-[#091329] focus:ring-[#091329]"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {!formData.isActive && (
                  <div className="bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 p-3.5 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-xs font-semibold">System Default Active</h4>
                      <p className="text-xs mt-0.5 opacity-90">This custom template is currently disabled. The system will fall back to the hardcoded default template.</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email Subject</label>
                  <input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Enter email subject"
                    disabled={!formData.isActive}
                    className="flex h-9 w-full rounded-md border border-border/60 bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email Body (HTML/Text)</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Enter email content..."
                    className="flex w-full rounded-md border border-border/60 bg-background p-3 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 min-h-[300px] font-mono text-xs leading-relaxed"
                    disabled={!formData.isActive}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code className="bg-muted px-1 py-0.5 rounded text-primary">{'{{propertyName}}'}</code> for dynamic variables (e.g., <code className="bg-muted px-1 py-0.5 rounded text-primary">{'{{memberName}}'}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{'{{planName}}'}</code>).
                    The content is automatically wrapped in the Sunshine Eldercare layout.
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-border/40">
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.isActive}
                    className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#091329] text-white hover:bg-[#091329]/90 h-9 px-4 py-2 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed border-border/60 rounded-lg bg-card/50">
              <Mail className="w-10 h-10 mb-3 text-muted-foreground/60" />
              <p className="text-sm">Select a template from the library to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
