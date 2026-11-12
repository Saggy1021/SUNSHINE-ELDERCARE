'use client';

import React from 'react';
import { PhoneCall, ShieldAlert, Phone } from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

const EMERGENCY_NUMBER = '03340585515';
const DISPLAY_NUMBER = '033-40585515';

export function CircularSosButton() {
  return (
    <section className="bg-white rounded-[1.75rem] border border-red-200/80 p-5 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
      {/* Ambient warm alert glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-50/60 via-red-50/20 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Header pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/80 border border-red-200 text-red-700 text-[11px] font-bold tracking-wide uppercase mb-3">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          <span>24/7 Emergency Assistance</span>
        </div>

        {/* Large Circular Direct Telephone Touch Button */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outer soft ambient pulse rings */}
          <div className="absolute w-[112px] h-[112px] rounded-full bg-red-500/15 animate-ping duration-1000 pointer-events-none" />
          <div className="absolute w-[104px] h-[104px] rounded-full border-2 border-red-300 bg-red-100/50 pointer-events-none" />

          {/* Direct tel link: immediately opens native phone dialer with 03340585515 */}
          <a
            href={`tel:${EMERGENCY_NUMBER}`}
            className="relative w-[92px] h-[92px] sm:w-[100px] sm:h-[100px] rounded-full bg-gradient-to-br from-[#DC2626] via-[#B91C1C] to-[#991B1B] text-white flex flex-col items-center justify-center shadow-xl shadow-red-900/25 border-4 border-[#FAF9F5] active:scale-95 hover:brightness-105 transition-all touch-target select-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-400"
            aria-label={`Tap to call Sunshine Emergency Helpline: ${DISPLAY_NUMBER}`}
          >
            <PhoneCall className="w-6 h-6 text-red-100 mb-0.5 animate-pulse" />
            <span className="text-xl font-black tracking-widest text-white leading-none">
              SOS
            </span>
          </a>
        </div>

        {/* Clear senior-friendly action label */}
        <h3 className="font-extrabold text-sm sm:text-base text-[#162850] mt-3 tracking-tight uppercase">
          TAP TO CALL FOR EMERGENCY HELP
        </h3>

        {/* Prominent telephone number badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-mono font-bold text-red-800 mt-1.5">
          <Phone className="w-3.5 h-3.5 text-red-600" />
          <span>Helpline: {DISPLAY_NUMBER}</span>
        </div>

        <p className="text-xs text-slate-500 max-w-[280px] mt-1.5 leading-relaxed">
          Tapping immediately opens your phone dialler with the Sunshine Care Desk ready to call.
        </p>
      </div>
    </section>
  );
}
