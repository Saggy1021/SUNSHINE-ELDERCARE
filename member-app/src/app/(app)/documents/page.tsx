'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { FileText, Download, Lock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await api.getDocuments();
        if (res.success && res.documents) {
          setDocuments(res.documents);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load official documents.');
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-[#B08A4A] uppercase tracking-wider">
          Financial & Legal Records
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#091329]">
          Receipts & Documents
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download verified money receipts and care plan agreements generated upon payment settlement.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-amber-900 font-bold hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-[#091329] border-t-[#B08A4A] rounded-full animate-spin" />
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#B08A4A]" />
              Official Money Receipts ({documents.length})
            </h3>
            <span className="text-[10px] text-slate-400">PDF Format</span>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-4 rounded-2xl border border-[#E8E6DF] shadow-xs space-y-3 hover:border-[#D8C08A] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#D8C08A]/40 flex items-center justify-center text-[#B08A4A]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#091329]">{doc.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {new Date(doc.issueDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        • {doc.planName}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Settled
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Amount Paid</span>
                    <p className="text-sm font-bold text-[#091329]">
                      ₹{doc.amount.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">incl. GST</span>
                    </p>
                  </div>

                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-[#091329] hover:bg-[#162850] text-[#D8C08A] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No Documents on File</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Payment receipts and formal membership agreements will be generated automatically when your plan is activated or renewed.
          </p>
        </div>
      )}

      {/* Security & Verification Guarantee */}
      <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-800">Tamper-Proof & IRS/GST Compliant</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            All receipts are cryptographically generated and signed by Sunshine Eldercare Private Limited. Protected by strict member ownership authorization.
          </p>
        </div>
      </div>
    </div>
  );
}
