'use client';

import React, { useEffect, useState } from 'react';
import { DigitalMembershipCard } from '@/components/membership-card/digital-membership-card';
import { SessionStore } from '@/lib/session-store';
import { api } from '@/lib/api-client';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

export default function CardPage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const cached = SessionStore.getSession();
    if (cached) setSession(cached);

    api.getMe().then((res) => {
      if (res.success) {
        setSession({
          profile: res.member,
          subscription: res.subscription,
        });
      }
    }).catch(() => {});
  }, []);

  const profile = session?.profile;
  const subscription = session?.subscription;

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-[#B08A4A] uppercase tracking-wider">
          Official Identity
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#091329]">
          Digital Membership Card
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Present this verified card at network hospitals, clinics, and during caregiver visits.
        </p>
      </div>

      {/* 3D Interactive Card Component */}
      <DigitalMembershipCard
        profile={profile}
        subscription={subscription}
        emergencyContact={profile?.emergencyContact}
      />

      {/* Card Inclusions & Features */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E6DF] shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-[#091329] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B08A4A]" />
          Card Benefits & Inclusions
        </h4>

        <ul className="space-y-2.5 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-900">Offline Ready:</strong> Card credentials & QR code remain accessible without internet connectivity.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-900">Hospital SOS Priority:</strong> Emergency contact, blood group & pre-authorized hospital instructions on card back.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-900">Instant Verification:</strong> Scanning the QR code validates membership status on the official website.
            </span>
          </li>
        </ul>
      </div>

      {/* Verification Instructions */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-[#B08A4A] shrink-0 mt-0.5" />
        <p>
          Card issued by <strong>Sunshine Eldercare Private Limited</strong>. Tied directly to Member ID{' '}
          <span className="font-mono font-bold">{profile?.memberId || 'SEC/MEMBER'}</span>.
        </p>
      </div>
    </div>
  );
}
