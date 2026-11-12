'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SessionStore, AppSession } from '@/lib/session-store';
import {
  X,
  Copy,
  Check,
  User,
  PhoneCall,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

interface MemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session?: AppSession | null;
}

export function MemberDrawer({ isOpen, onClose, session }: MemberDrawerProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSession = session || SessionStore.getSession();
  const memberName = currentSession?.name || 'Sunshine Member';
  const memberId = currentSession?.memberId || 'SEC/MEMBER';
  const subscription = currentSession?.subscription;

  const initials = memberName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('') || 'SM';

  const handleCopyMemberId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    onClose();
    await SessionStore.logout();
  };

  const formattedExpiry = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Ongoing Active Coverage';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#091329]/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-[320px] sm:max-w-xs bg-[#FAF9F5] h-full shadow-2xl flex flex-col justify-between border-l border-[#D8C08A]/50 animate-in slide-in-from-right duration-300">
        <div>
          {/* Drawer Header */}
          <div className="p-4 bg-[#091329] text-white flex items-center justify-between border-b border-[#162850]">
            <div className="relative h-9 w-32">
              <Image
                src="/images/logo-new.png"
                alt="Sunshine Eldercare"
                fill
                className="object-contain object-left"
                sizes="128px"
              />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 touch-target flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Member Card Summary */}
          <div className="p-4 bg-white border-b border-[#E8E2D6] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 rounded-2xl bg-[#091329] text-[#B08A4A] border-2 border-[#B08A4A] flex items-center justify-center font-bold text-lg shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-[#162850] truncate">{memberName}</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Member
                </span>
              </div>
            </div>

            {/* Member ID with Copy Button */}
            <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-[#D8C08A]/60 flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Member ID</p>
                <p className="text-xs font-mono font-bold text-[#162850]">{memberId}</p>
              </div>
              <button
                onClick={handleCopyMemberId}
                className="p-1.5 bg-white border border-[#D8C08A]/80 hover:bg-[#FAF9F5] rounded-lg text-slate-600 active:scale-90 transition-transform"
                title="Copy Member ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 p-3 text-xs font-bold text-[#162850] hover:bg-white rounded-xl transition-colors"
            >
              <User className="w-4 h-4 text-[#B08A4A]" />
              <span>Dashboard Overview</span>
            </Link>

            <Link
              href="/card"
              onClick={onClose}
              className="flex items-center gap-3 p-3 text-xs font-bold text-[#162850] hover:bg-white rounded-xl transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#B08A4A]" />
              <span>Digital Membership Card</span>
            </Link>

            <Link
              href="/documents"
              onClick={onClose}
              className="flex items-center gap-3 p-3 text-xs font-bold text-[#162850] hover:bg-white rounded-xl transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#B08A4A]" />
              <span>Receipts & Documents</span>
            </Link>

            <Link
              href="/renew"
              onClick={onClose}
              className="flex items-center gap-3 p-3 text-xs font-bold text-[#162850] hover:bg-white rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4 text-[#B08A4A]" />
              <span>Renew / Upgrade Care Plan</span>
            </Link>

            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-3 p-3 text-xs font-bold text-[#162850] hover:bg-white rounded-xl transition-colors"
            >
              <User className="w-4 h-4 text-[#B08A4A]" />
              <span>Personal Profile & Emergency Contacts</span>
            </Link>
          </nav>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#E8E2D6] space-y-3 bg-white">
          <a
            href="tel:+919088882222"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FAF9F5] border border-[#D8C08A] hover:bg-[#F2EFE8] rounded-xl text-xs font-bold text-[#162850] transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-[#B08A4A]" />
            <span>24/7 Helpline: +91 90888 82222</span>
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
