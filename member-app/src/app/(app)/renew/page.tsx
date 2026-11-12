'use client';

import React, { useEffect } from 'react';
import { ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

const WEBSITE_RENEWAL_URL = 'https://www.sunshineeldercare.in/dashboard/renew';

export default function RenewPage() {
  useEffect(() => {
    // Automatically redirect to the authoritative website renewal portal
    if (typeof window !== 'undefined') {
      window.location.href = WEBSITE_RENEWAL_URL;
    }
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto text-center space-y-5 pt-12">
      <div className="w-16 h-16 bg-[#FAF9F5] border-2 border-[#D8C08A] rounded-2xl flex items-center justify-center mx-auto text-[#162850] shadow-sm">
        <ShieldCheck className="w-8 h-8 text-[#B08A4A]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#162850]">
          Redirecting to Sunshine Eldercare
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          Membership renewal, plan selection, duration options, and secure Razorpay payment processing are managed directly on the official Sunshine Eldercare website.
        </p>
      </div>

      <div className="pt-2">
        <a
          href={WEBSITE_RENEWAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#B08A4A] hover:bg-[#8F6F3A] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
        >
          <span>Open Website Renewal Portal</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <p className="text-[11px] text-slate-400">
        If you are not redirected automatically, tap the button above.
      </p>
    </div>
  );
}
