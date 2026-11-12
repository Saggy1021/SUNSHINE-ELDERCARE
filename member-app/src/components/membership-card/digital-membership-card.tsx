'use client';

import React, { useState } from 'react';
import { CardQrCode } from './card-qr-code';
import { ShieldCheck, Phone, RefreshCw, Share2, Heart, AlertCircle, Sparkles, AlertTriangle } from 'lucide-react';

interface DigitalMembershipCardProps {
  profile?: any;
  subscription?: any;
  emergencyContact?: any;
}

export function DigitalMembershipCard({
  profile,
  subscription,
  emergencyContact,
}: DigitalMembershipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const memberName =
    profile?.name ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    'Sunshine Member';

  const memberId = profile?.memberId || 'SEC/MEMBER';

  const planName = subscription?.planName || subscription?.carePlan?.name || 'Care Package';
  const variantType = subscription?.variantType || 'SINGLE';
  const status = (subscription?.status || 'ACTIVE').toUpperCase();
  const isActive = status === 'ACTIVE' || status === 'EXPIRING';

  const formattedExpiry = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Active / Ongoing';

  const contactName = emergencyContact?.name || emergencyContact?.fullName || 'Primary Family Contact';
  const contactPhone = emergencyContact?.phone || '+91 90888 82222';
  const bloodGroup = profile?.bloodGroup || 'On File';
  const hospital = profile?.preferredHospital || profile?.hospitalPreference || 'Apollo Multispeciality / Nearest';

  const handleShare = async () => {
    const shareData = {
      title: `${memberName} — Sunshine Eldercare Card`,
      text: `Sunshine Eldercare Digital Card\nMember: ${memberName}\nID: ${memberId}\nPlan: ${planName} (${variantType})\nValid Until: ${formattedExpiry}\nEmergency Contact: ${contactName} (${contactPhone})`,
      url: `https://www.sunshineeldercare.in/verify-card?id=${encodeURIComponent(memberId)}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Share dismissed
      }
    } else {
      await navigator.clipboard.writeText(shareData.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 3D Flip Card Container */}
      <div
        className="w-full max-w-[380px] h-[230px] perspective-1000 cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full rounded-2xl shadow-2xl transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ================= CARD FRONT ================= */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#091329] via-[#0E1E3D] to-[#060D1D] p-5 text-white flex flex-col justify-between border-2 border-[#B08A4A]/50 shadow-2xl backface-hidden overflow-hidden">
            {/* Background subtle sheen */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#B08A4A]/10 pointer-events-none blur-xl" />
            <div className="absolute top-0 right-0 p-3 opacity-15">
              <Sparkles className="w-32 h-32 text-[#B08A4A]" />
            </div>

            {/* Top row: Brand + Active Badge */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#162850] border border-[#B08A4A] flex items-center justify-center">
                  <span className="font-serif font-bold text-[#B08A4A] text-sm">S</span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xs tracking-wider text-[#FAF9F5]">
                    SUNSHINE ELDERCARE
                  </h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#B08A4A] font-semibold">
                    Digital Member Pass
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                }`}
              >
                {isActive ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                <span>{status}</span>
              </div>
            </div>

            {/* Middle row: Member Name & QR */}
            <div className="relative z-10 flex items-center justify-between gap-3 mt-1">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Member Name</p>
                <p className="text-lg font-bold text-white tracking-tight leading-tight">
                  {memberName}
                </p>
                <p className="text-xs font-mono font-bold text-[#B08A4A] tracking-wider mt-0.5">
                  {memberId}
                </p>
              </div>

              <CardQrCode memberId={memberId} size={64} />
            </div>

            {/* Bottom row: Plan Tier & Expiry */}
            <div className="relative z-10 flex items-end justify-between pt-2 border-t border-[#162850]">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Care Plan Tier</p>
                <p className="text-xs font-bold text-[#D4AF37]">
                  {planName} ({variantType})
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Valid Until</p>
                <p className="text-xs font-mono font-bold text-slate-200">{formattedExpiry}</p>
              </div>
            </div>
          </div>

          {/* ================= CARD BACK ================= */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#162850] via-[#091329] to-[#040814] p-5 text-white flex flex-col justify-between border-2 border-[#D8C08A]/50 shadow-2xl backface-hidden rotate-y-180 overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[10px] font-bold text-[#D8C08A] uppercase tracking-wider flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-400" />
                  Emergency Medical Information
                </span>
                <span className="text-[9px] text-slate-400 font-mono">Confidential</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Emergency Contact</p>
                  <p className="text-xs font-bold text-white leading-tight mt-0.5">{contactName}</p>
                  <p className="text-xs font-mono text-emerald-400">{contactPhone}</p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Blood Group</p>
                  <p className="text-sm font-bold text-red-400 leading-tight mt-0.5">{bloodGroup}</p>
                </div>

                <div className="col-span-2">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Hospital Preference</p>
                  <p className="text-xs font-medium text-slate-200 leading-tight mt-0.5 line-clamp-1">
                    {hospital}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[9px] text-slate-400">24/7 Helpline: +91 90888 82222</span>
              <span className="text-[9px] text-[#D8C08A] font-semibold">Tap to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Controls */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-1 hover:text-[#091329] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Flip Card</span>
        </button>

        <span className="text-slate-300">•</span>

        <button
          onClick={handleShare}
          className="flex items-center gap-1 hover:text-[#091329] transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Card Copied!' : 'Share Pass'}</span>
        </button>
      </div>
    </div>
  );
}
