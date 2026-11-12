'use client';

import React, { useState } from 'react';
import { PhoneCall, ShieldAlert } from 'lucide-react';
import { QuickSosModal } from './quick-sos-modal';

export function CircularSosButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="bg-white rounded-[1.75rem] border border-[#D8C08A]/40 p-5 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle background warm glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-50/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Header pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-[11px] font-bold tracking-wide uppercase mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>24/7 Emergency Assistance</span>
          </div>

          {/* Large Circular SOS Control */}
          <div className="relative flex items-center justify-center my-1">
            {/* Outer soft ambient pulse ring */}
            <div className="absolute w-[104px] h-[104px] rounded-full bg-red-500/15 animate-ping duration-1000 pointer-events-none" />
            <div className="absolute w-[96px] h-[96px] rounded-full border-2 border-[#B08A4A]/40 bg-red-100/40 pointer-events-none" />

            {/* The main circular touch button */}
            <button
              onClick={() => setModalOpen(true)}
              className="relative w-[86px] h-[86px] rounded-full bg-gradient-to-br from-[#DC2626] via-[#B91C1C] to-[#991B1B] text-white flex flex-col items-center justify-center shadow-lg shadow-red-900/25 border-3 border-[#FAF9F5] active:scale-95 transition-transform touch-target select-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-300"
              aria-label="Activate Emergency SOS Assistance"
            >
              <PhoneCall className="w-5 h-5 text-red-100 mb-0.5 animate-pulse" />
              <span className="text-xl font-black tracking-widest text-white leading-none">
                SOS
              </span>
            </button>
          </div>

          {/* Descriptive instruction for elders */}
          <p className="font-bold text-sm text-[#162850] mt-3 tracking-tight">
            Tap for Immediate Support
          </p>
          <p className="text-xs text-slate-500 max-w-[260px] mt-0.5 leading-relaxed">
            Directly connect to Sunshine Care Desk or designated family sponsor.
          </p>
        </div>
      </section>

      {/* Confirmation Emergency Modal */}
      <QuickSosModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

