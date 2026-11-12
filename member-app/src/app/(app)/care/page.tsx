'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { SessionStore } from '@/lib/session-store';
import { Phone, Calendar, Clock, Activity, CheckCircle2, UserCheck, Shield, HelpCircle, PhoneCall } from 'lucide-react';

export default function CarePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const cached = SessionStore.getSession();
    if (cached) setData({ member: cached.profile, membership: cached.subscription });

    api.getDashboard().then((res) => {
      if (res.success) setData(res);
    }).catch(() => {});
  }, []);

  const member = data?.member;
  const membership = data?.membership;
  const services = membership?.services || [
    { serviceName: 'Comprehensive Care Service', serviceNote: 'Standard Eldercare Attendant Coverage' },
    { serviceName: '24/7 Emergency Assistant', serviceNote: 'Priority SOS Response' },
    { serviceName: 'Daily Wellness Calls', serviceNote: 'Daily morning wellbeing check' },
    { serviceName: 'Monthly Senior Staff Visit', serviceNote: 'Comprehensive vitals & home assessment' },
  ];

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-[#B08A4A] uppercase tracking-wider">
          Care Operations
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#091329]">
          Care Tracking & Services
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review your enrolled healthcare benefits, care management team, and scheduled visit logs.
        </p>
      </div>

      {/* Primary Care Desk Support Card */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E6DF] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-[#091329] uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[#B08A4A]" />
            Dedicated Care Management Desk
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            Active
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#091329] text-[#D8C08A] flex items-center justify-center font-bold text-base shadow-sm">
              SC
            </div>
            <div>
              <p className="font-bold text-base text-[#091329]">Sunshine Care Coordination Desk</p>
              <p className="text-xs text-slate-500">Supervised by Senior Clinical Lead</p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">+91 90888 82222</p>
            </div>
          </div>

          <a
            href="tel:+919088882222"
            className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs active:scale-95 transition-transform"
            title="Call Care Coordinator"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Included Care Services from Database */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E6DF] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#091329] uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#B08A4A]" />
          Enrolled Plan Services ({membership?.planName || 'Care Package'})
        </h3>

        <div className="space-y-2.5">
          {services.map((s: any, idx: number) => (
            <div
              key={idx}
              className="p-3 bg-[#FAF9F5] rounded-xl border border-slate-100 flex items-start gap-2.5 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#091329]">{s.serviceName}</p>
                {s.serviceNote && <p className="text-[11px] text-slate-500 mt-0.5">{s.serviceNote}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book On-Demand Visit */}
      <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200/80 space-y-2">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-[#B08A4A]" />
          Schedule Physician or Attendant Visit
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Need to reschedule a routine checkup or request an extra medical escort? Contact your care manager at +91 90888 82222.
        </p>
        <a
          href="tel:+919088882222"
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#091329] text-[#D8C08A] rounded-xl text-xs font-bold mt-1"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call Care Coordinator</span>
        </a>
      </div>
    </div>
  );
}
