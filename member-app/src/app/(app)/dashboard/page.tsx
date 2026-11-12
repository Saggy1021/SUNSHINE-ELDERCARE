'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircularSosButton } from '@/components/sos/circular-sos-button';
import { ServiceShortcuts } from '@/components/home/service-shortcuts';
import { RaiseAnIssueSection } from '@/components/home/raise-an-issue-section';
import { DigitalMembershipCard } from '@/components/membership-card/digital-membership-card';
import { api } from '@/lib/api-client';
import { SessionStore } from '@/lib/session-store';
import { Clock, Phone, ShieldCheck, Sparkles, FileText, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { usePwa } from '@/lib/pwa';

export default function DashboardPage() {
  const { isInstallable, triggerInstall } = usePwa();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const cached = SessionStore.getSession();
        if (cached?.profile && mounted) {
          setData({
            member: cached.profile,
            membership: cached.subscription,
            recentReceipts: [],
            systemNotifications: [],
          });
        }

        const res = await api.getDashboard();
        if (mounted && res.success) {
          setData(res);
          setError(null);
        }
      } catch (err: any) {
        if (mounted && !data) {
          setError(err?.message || 'Unable to fetch latest member data.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const member = data?.member;
  const membership = data?.membership;
  const receipts = data?.recentReceipts || [];
  const notifications = data?.systemNotifications || [];

  const isActive = membership?.status === 'ACTIVE' || membership?.status === 'EXPIRING';

  return (
    <div className="p-4 space-y-6">
      {/* PWA Install Notification if installable */}
      {isInstallable && (
        <div className="bg-[#162850] text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md border border-[#D8C08A]/50 animate-in fade-in">
          <div>
            <p className="text-xs font-bold text-[#FAF9F5]">Install Sunshine Member App</p>
            <p className="text-[10px] text-slate-300">Add to phone home screen for 1-tap card access</p>
          </div>
          <button
            onClick={triggerInstall}
            className="px-3.5 py-1.5 bg-[#B08A4A] text-white rounded-xl text-xs font-bold shrink-0 shadow-xs active:scale-95 transition-transform"
          >
            Install
          </button>
        </div>
      )}

      {/* Error Alert */}
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

      {/* Personalised Member Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold text-[#B08A4A] uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Member Overview
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#162850]">
            Hello, {member?.name || 'Member'}
          </h2>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{membership?.status || 'ACTIVE'}</span>
          </span>
          <p className="text-[10px] font-mono font-bold text-[#B08A4A] mt-1">
            {member?.memberId || 'SEC/MEMBER'}
          </p>
        </div>
      </div>

      {/* 1. Large Circular SOS Emergency Button */}
      <CircularSosButton />

      {/* 2. Interactive Digital Membership Card */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-[#162850] uppercase tracking-wider">
            Your Digital Membership Card
          </h3>
          <span className="text-xs text-slate-400">Tap to flip</span>
        </div>
        <DigitalMembershipCard
          profile={member}
          subscription={membership}
          emergencyContact={member?.emergencyContact}
        />
      </section>

      {/* 3. Service Shortcuts */}
      <ServiceShortcuts />

      {/* 4. Active Membership Summary */}
      <section className="bg-white p-4 rounded-[1.75rem] border border-[#D8C08A]/40 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-[#162850] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#B08A4A]" />
            Active Care Package
          </span>
          <Link
            href="/renew"
            className="text-xs font-bold text-[#B08A4A] hover:underline flex items-center gap-1"
          >
            <span>Manage Plan</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div>
          <h4 className="font-bold text-base text-[#162850]">
            {membership?.planName || 'Comprehensive Elder Care Package'}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {membership?.category || 'Single Elder Care'} • Valid until{' '}
            {membership?.endDate
              ? new Date(membership.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Ongoing'}
          </p>
        </div>

        {membership?.daysRemaining !== undefined && (
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#D8C08A]/30 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#162850]">
                {membership.daysRemaining > 0 ? `${membership.daysRemaining} Days of Coverage Left` : 'Membership Expired'}
              </p>
              <p className="text-[10px] text-slate-500">24/7 Helpline & Rapid Response active</p>
            </div>
            <Link
              href="/renew"
              className="px-3 py-1.5 bg-[#B08A4A] text-white rounded-lg text-xs font-bold shrink-0 hover:bg-[#8F6F3A] transition-colors"
            >
              Renew
            </Link>
          </div>
        )}
      </section>

      {/* 5. Recent Receipts from Database */}
      <section className="bg-white p-4 rounded-[1.75rem] border border-[#D8C08A]/40 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-[#162850] uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#B08A4A]" />
            Official Receipts & Documents
          </span>
          <Link
            href="/documents"
            className="text-xs font-bold text-[#B08A4A] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {receipts.length > 0 ? (
          <div className="space-y-2">
            {receipts.slice(0, 3).map((r: any) => (
              <div
                key={r.id}
                className="p-3 bg-[#FAF9F5] rounded-xl border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-[#162850]">Receipt #{r.receiptNumber}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(r.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    • ₹{r.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <a
                  href={r.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white border border-[#D8C08A] text-[#162850] rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Download PDF
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-2 text-center">
            Your receipts and tax invoices will appear here after payment settlement.
          </p>
        )}
      </section>

      {/* 6. Raise an Issue / Complaint Section */}
      <RaiseAnIssueSection />

      {/* Footer Branding */}
      <div className="text-center text-xs text-slate-400 pt-3 pb-2 space-y-1">
        <p className="font-semibold text-[#162850]">Sunshine Eldercare Private Limited</p>
        <p className="text-[10px]">Connected to Official Production Membership Platform</p>
      </div>
    </div>
  );
}
