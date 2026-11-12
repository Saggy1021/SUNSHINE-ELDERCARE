'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  HandHeart,
  FileText,
  Activity,
  CreditCard,
  Bell,
  ChevronRight,
  Phone,
  X,
  User,
  ExternalLink,
} from 'lucide-react';
import { APP_CONFIG } from '@/lib/constants';

interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  href?: string;
  externalHref?: string;
  action?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function ServiceShortcuts() {
  const [assistanceModalOpen, setAssistanceModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  const shortcuts: ShortcutItem[] = [
    {
      id: 'membership',
      name: 'Member Profile',
      description: 'Personal & emergency details',
      href: '/profile',
      icon: User,
      badge: 'Active',
    },
    {
      id: 'assistance',
      name: 'Book Assistance',
      description: 'Companion, outing & escort',
      action: () => setAssistanceModalOpen(true),
      icon: HandHeart,
    },
    {
      id: 'documents',
      name: 'Documents & Receipts',
      description: 'Download PDF money receipts',
      href: '/documents',
      icon: FileText,
    },
    {
      id: 'care',
      name: 'Care Services',
      description: 'Caregiver & physician visits',
      href: '/care',
      icon: Activity,
    },
    {
      id: 'payments',
      name: 'Renew Membership',
      description: 'Official website portal',
      externalHref: 'https://www.sunshineeldercare.in/dashboard/renew',
      icon: CreditCard,
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Medicine & visit alerts',
      action: () => setNotificationsModalOpen(true),
      icon: Bell,
      badge: '2 New',
    },
  ];

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-[#162850] uppercase tracking-wider">
            Service Shortcuts
          </h3>
          <span className="text-xs text-slate-400">All Services</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const content = (
              <div className="h-full flex flex-col justify-between p-3.5 bg-white rounded-2xl border border-[#D8C08A]/40 shadow-xs hover:border-[#B08A4A] active:scale-[0.98] transition-all cursor-pointer">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F2F5F9] border border-[#D8C08A]/30 flex items-center justify-center text-[#162850]">
                      <Icon className="w-5 h-5 text-[#B08A4A]" />
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-[#162850] leading-tight">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-normal">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center text-[11px] font-bold text-[#B08A4A] mt-2.5 pt-2 border-t border-slate-100">
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
                </div>
              </div>
            );

            if (item.externalHref) {
              return (
                <a
                  key={item.id}
                  href={item.externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {content}
                </a>
              );
            }

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <div key={item.id} onClick={item.action}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* Book Assistance Modal */}
      {assistanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#091329]/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF9F5] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border-t sm:border border-[#D8C08A]/50">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8C08A]/40 mb-3">
              <div className="flex items-center gap-2 text-[#162850]">
                <HandHeart className="w-5 h-5 text-[#B08A4A]" />
                <h3 className="font-bold text-base">Book Eldercare Assistance</h3>
              </div>
              <button onClick={() => setAssistanceModalOpen(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Need temporary escort for medical diagnostics, banking assistance, or social outing companion? Speak directly with your dedicated Sunshine Care Manager:
            </p>

            <a
              href={`tel:${APP_CONFIG.emergencyHelpline}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#162850] text-white rounded-xl text-xs font-bold shadow-xs active:scale-98 transition-transform"
            >
              <Phone className="w-4 h-4 text-[#B08A4A]" />
              <span>Call Care Manager ({APP_CONFIG.emergencyHelpline})</span>
            </a>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {notificationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#091329]/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF9F5] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border-t sm:border border-[#D8C08A]/50">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8C08A]/40 mb-3">
              <div className="flex items-center gap-2 text-[#162850]">
                <Bell className="w-5 h-5 text-[#B08A4A]" />
                <h3 className="font-bold text-base">Recent Notifications</h3>
              </div>
              <button onClick={() => setNotificationsModalOpen(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">Upcoming Visit Today at 4:30 PM</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Senior Attendant Ananya Banerjee will visit for evening mobility check.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">Payment Receipt Verified</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Receipt #SEC-REC-2026-1001 for ₹54,000 is ready for PDF download.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

