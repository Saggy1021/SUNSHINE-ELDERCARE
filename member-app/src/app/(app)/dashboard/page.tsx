'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircularSosButton } from '@/components/sos/circular-sos-button';
import { ServiceShortcuts } from '@/components/home/service-shortcuts';
import { RaiseAnIssueSection } from '@/components/home/raise-an-issue-section';
import { api } from '@/lib/api-client';
import { SessionStore } from '@/lib/session-store';
import {
  Clock,
  Phone,
  ShieldCheck,
  Sparkles,
  FileText,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Calendar,
  UserCheck,
  CheckCircle2,
  HeartHandshake,
  Tag,
} from 'lucide-react';
import { usePwa } from '@/lib/pwa';

const WEBSITE_RENEWAL_URL = 'https://www.sunshineeldercare.in/dashboard/renew';

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
  const category =
    membership?.category ||
    (membership?.variantType === 'COUPLE' ? 'Couple Care' : 'Single Elder Care');

  const formattedStartDate = membership?.startDate
    ? new Date(membership.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Active / Activated on Sign-up';

  const formattedEndDate = membership?.endDate
    ? new Date(membership.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Ongoing Coverage';

  const services = membership?.services || [];

  return (
    <div className="p-4 space-y-6">
      {/* PWA Install Notification if installable */}
      {isInstallable && (
        <div className="bg-[#162850] text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md border border-[#D8C08A]/50 animate-in fade-in">
          <div>
            <p className="text-xs font-bold text-[#FAF9F5]">Install Sunshine Member App</p>
            <p className="text-[10px] text-slate-300">Add to phone home screen for fast 1-tap access</p>
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

      {/* 2. Authoritative Membership & Care Plan Information (Standard Clean Layout) */}
      <section className="bg-white rounded-2xl border border-[#D8C08A]/50 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-4 bg-gradient-to-r from-[#162850] to-[#091329] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#B08A4A] text-white">
                {category}
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold text-[#D8C08A]">
                {membership?.status || 'ACTIVE'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {membership?.planName || 'Comprehensive Elder Care Package'}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-300 font-semibold tracking-wider">
              Member ID
            </p>
            <p className="text-xs font-mono font-bold text-[#FAF9F5]">
              {member?.memberId || 'SEC/MEMBER'}
            </p>
          </div>
        </div>

        {/* Structured Member & Coverage Details */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Member Name
              </p>
              <p className="text-xs font-bold text-[#162850]">
                {member?.name || 'Sunshine Member'}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Care Category
              </p>
              <p className="text-xs font-bold text-[#162850]">
                {category}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Start Date
              </p>
              <p className="text-xs font-bold text-[#162850] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#B08A4A]" />
                <span>{formattedStartDate}</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Expiry Date
              </p>
              <p className="text-xs font-bold text-[#162850] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#B08A4A]" />
                <span>{formattedEndDate}</span>
              </p>
            </div>
          </div>

          {/* Days remaining badge if expiring soon */}
          {membership?.daysRemaining !== undefined && (
            <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#D8C08A]/40 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#162850]">
                  {membership.daysRemaining > 0
                    ? `${membership.daysRemaining} Days of Active Coverage Remaining`
                    : 'Coverage Renewal Due'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Continuous 24/7 care desk and emergency protocol coverage active
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                  membership.daysRemaining > 30
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {membership.daysRemaining > 0 ? `${membership.daysRemaining}d` : 'Expired'}
              </span>
            </div>
          )}

          {/* Included Care Plan Services from Backend */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#162850] uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-[#B08A4A]" />
              <span>Included Services & Entitlements</span>
            </p>
            {services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {services.map((svc: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#162850] truncate">
                        {svc.serviceName}
                      </p>
                      {svc.serviceNote && (
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {svc.serviceNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                Official care services and emergency coverage active on your profile.
              </div>
            )}
          </div>

          {/* Prominent Renew Membership Button */}
          <div className="pt-2">
            <a
              href={WEBSITE_RENEWAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3.5 bg-gradient-to-r from-[#B08A4A] to-[#8F6F3A] hover:from-[#9C793E] hover:to-[#7E6130] active:scale-[0.99] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Renew Membership</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Directs to official Sunshine Eldercare renewal and Razorpay payment portal
            </p>
          </div>
        </div>
      </section>

      {/* 3. Service Shortcuts */}
      <ServiceShortcuts />

      {/* 4. Official Receipts & Documents from Backend */}
      <section className="bg-white p-4 rounded-2xl border border-[#D8C08A]/40 shadow-xs space-y-3">
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

      {/* 5. Raise an Issue / Complaint Section */}
      <RaiseAnIssueSection />

      {/* Footer Branding */}
      <div className="text-center text-xs text-slate-400 pt-3 pb-2 space-y-1">
        <p className="font-semibold text-[#162850]">Sunshine Eldercare Private Limited</p>
        <p className="text-[10px]">Connected to Official Production Membership Platform</p>
      </div>
    </div>
  );
}
