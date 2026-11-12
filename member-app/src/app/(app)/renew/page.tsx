'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { TouchButton } from '@/components/ui/touch-button';
import { ShieldCheck, Sparkles, Check, CreditCard, Clock, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function RenewPage() {
  const [currentMembership, setCurrentMembership] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlanSlug, setSelectedPlanSlug] = useState('shield-shine');
  const [selectedVariant, setSelectedVariant] = useState<'SINGLE' | 'COUPLE'>('SINGLE');
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await api.getMembership();
        if (res.success) {
          setCurrentMembership(res.currentMembership);
          if (res.availablePlans?.length > 0) {
            setPlans(res.availablePlans);
            setSelectedPlanSlug(res.availablePlans[0].slug);
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load membership plans.');
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  const currentPlan = plans.find((p) => p.slug === selectedPlanSlug) || plans[0];
  const variant = currentPlan?.variants?.find((v: any) => v.variantType === selectedVariant) || currentPlan?.variants?.[0];
  const duration = variant?.durations?.find((d: any) => d.months === selectedMonths) || variant?.durations?.[0];

  // Exact documented total from server database (never calculated on client)
  const documentedPrice = duration?.documentedTotal || 0;
  const hasDiscount = duration?.hasDiscount || false;
  const discountNote = duration?.discountNote || '';

  const handleProceedToPayment = () => {
    setSubmitting(true);
    // Directs to the authoritative website Razorpay checkout flow
    const checkoutUrl = `https://www.sunshineeldercare.in/checkout?plan=${encodeURIComponent(
      currentPlan.slug
    )}&variant=${encodeURIComponent(selectedVariant)}&duration=${selectedMonths}`;
    window.location.href = checkoutUrl;
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-[#B08A4A] uppercase tracking-wider">
          Membership Continuity
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#091329]">
          Renew or Upgrade Care Plan
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select an official Sunshine care package to ensure continuous health, emergency, and companion support.
        </p>
      </div>

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

      {/* Current Plan Status Box */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8E6DF] shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">Current Active Plan</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {currentMembership?.status || 'Active'}
          </span>
        </div>
        <p className="text-base font-bold text-[#091329]">
          {currentMembership?.planName || 'Comprehensive Elder Care Package'} ({currentMembership?.variantType || 'SINGLE'})
        </p>
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#B08A4A]" />
          <span>
            Valid until:{' '}
            {currentMembership?.endDate
              ? new Date(currentMembership.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Ongoing'}
          </span>
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-[#091329] border-t-[#B08A4A] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Plan Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#091329] uppercase tracking-wider">
              1. Choose Care Package
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {plans.map((p) => {
                const isSelected = p.slug === selectedPlanSlug;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setSelectedPlanSlug(p.slug)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#B08A4A] bg-[#FAF9F5] shadow-xs'
                        : 'border-[#E8E6DF] bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#091329]">{p.name}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#B08A4A] text-white flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member Tier (Single / Couple) */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#091329] uppercase tracking-wider">
              2. Member Coverage
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['SINGLE', 'COUPLE'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedVariant(tier)}
                  className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                    selectedVariant === tier
                      ? 'border-[#B08A4A] bg-[#091329] text-[#D8C08A]'
                      : 'border-[#E8E6DF] bg-white text-slate-700'
                  }`}
                >
                  {tier === 'SINGLE' ? 'Single Elder' : 'Elderly Couple'}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#091329] uppercase tracking-wider">
              3. Subscription Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => {
                const isSelected = selectedMonths === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonths(m)}
                    className={`py-2.5 px-1 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? 'border-[#B08A4A] bg-[#FAF9F5] text-[#091329]'
                        : 'border-[#E8E6DF] bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs font-bold">{m} Mo</p>
                    {m === 12 && (
                      <span className="text-[9px] text-[#B08A4A] font-bold block mt-0.5">Save 7.5%</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authoritative Price & Inclusions Card */}
          <div className="p-4 bg-white rounded-2xl border-2 border-[#D8C08A] shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#B08A4A] tracking-wider">Total Documented Price</p>
                <h3 className="text-2xl font-bold text-[#091329] tracking-tight">
                  ₹{documentedPrice.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-slate-500">incl. 18% GST</span>
                </h3>
              </div>
              {hasDiscount && (
                <span className="px-2.5 py-1 bg-amber-50 text-[#B08A4A] border border-[#D8C08A] rounded-lg text-xs font-bold">
                  {discountNote}
                </span>
              )}
            </div>

            {/* Inclusions list from database */}
            {variant?.services && variant.services.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Included Services:</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {variant.services.map((s: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{s.serviceName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2">
              <TouchButton
                type="button"
                variant="primary"
                size="lg"
                disabled={submitting}
                onClick={handleProceedToPayment}
              >
                <CreditCard className="w-4 h-4 text-[#D8C08A]" />
                <span>{submitting ? 'Connecting Gateway...' : 'Proceed to Secure Payment'}</span>
              </TouchButton>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Processed securely via Razorpay PCI-DSS certified gateway.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
