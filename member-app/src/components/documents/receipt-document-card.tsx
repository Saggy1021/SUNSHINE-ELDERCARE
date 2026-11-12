'use client';

import React, { useState } from 'react';
import { Receipt, Invoice } from '@/lib/types';
import { Download, FileText, CheckCircle2, Share2 } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

interface ReceiptDocumentCardProps {
  receipt?: Receipt;
  invoice?: Invoice;
}

export function ReceiptDocumentCard({ receipt, invoice }: ReceiptDocumentCardProps) {
  const [downloading, setDownloading] = useState(false);

  const isReceipt = !!receipt;
  const itemNumber = isReceipt ? receipt!.receiptNumber : invoice!.invoiceNumber;
  const amount = isReceipt ? receipt!.amount : invoice!.total;
  const dateStr = isReceipt ? receipt!.paymentDate : invoice!.issueDate;
  const title = isReceipt ? 'Money Receipt' : 'Tax Invoice';
  const planInfo = isReceipt ? receipt!.relatedPlanName : 'Care Plan Invoice';

  const downloadUrl = `${APP_CONFIG.apiUrl}${isReceipt ? receipt!.downloadUrl : invoice!.downloadUrl}`;

  const formattedDate = new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleShare = async () => {
    const text = `Sunshine Eldercare — ${title} ${itemNumber}\nAmount: ₹${amount.toLocaleString('en-IN')}\nDate: ${formattedDate}\nDownload: ${downloadUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: downloadUrl });
      } catch {
        // dismissed
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Document link copied to clipboard!');
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-[#E8E6DF] shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-[#B08A4A]/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#091329]/5 text-[#091329] flex items-center justify-center border border-slate-200">
            <FileText className="w-5 h-5 text-[#B08A4A]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs text-[#091329]">{itemNumber}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> PAID
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{planInfo}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-[#091329]">₹{amount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">{formattedDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setDownloading(true);
            setTimeout(() => setDownloading(false), 2000);
          }}
          className="flex-1 py-2 px-3 bg-[#091329] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
        </a>

        <button
          onClick={handleShare}
          className="py-2 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
          title="Share Receipt"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

