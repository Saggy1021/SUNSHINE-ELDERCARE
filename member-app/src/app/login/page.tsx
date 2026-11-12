'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStore } from '@/lib/session-store';
import { TouchButton } from '@/components/ui/touch-button';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = memberId.trim();
    if (!cleanId) {
      setError('Please enter your Sunshine Member ID.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);

    try {
      const result = await SessionStore.login(cleanId, password);
      if (result.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error connecting to Sunshine Eldercare. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#FAF9F5] min-h-screen">
      {/* Top Branding */}
      <div className="pt-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#091329] border-2 border-[#B08A4A] flex items-center justify-center shadow-lg mb-4">
          <span className="font-serif font-bold text-[#B08A4A] text-2xl">S</span>
        </div>
        <h1 className="font-serif font-bold text-2xl text-[#091329] tracking-tight">
          Member Sign In
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
          Sign in using your official Sunshine Member ID and website password.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 my-auto py-6 max-w-sm mx-auto w-full">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Member ID Field */}
        <div>
          <label className="block text-xs font-bold text-[#091329] uppercase tracking-wider mb-1.5">
            Member ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="e.g. SEC/S/1001/SAKR"
              autoCapitalize="characters"
              autoComplete="username"
              required
              className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-[#E8E6DF] rounded-xl text-base text-[#091329] font-mono focus:outline-none focus:border-[#B08A4A] transition-colors"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Format: SEC/S/XXXX/XXXX</span>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-[#B08A4A] hover:underline font-semibold"
            >
              Where is my ID?
            </button>
          </p>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-[#091329] uppercase tracking-wider">
              Password
            </label>
            <a
              href="https://www.sunshineeldercare.in/forgot-password"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#B08A4A] hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Forgot Password?</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your website password"
              autoComplete="current-password"
              required
              className="w-full pl-11 pr-12 py-3.5 bg-white border-2 border-[#E8E6DF] rounded-xl text-base text-[#091329] focus:outline-none focus:border-[#B08A4A] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <TouchButton type="submit" variant="primary" size="lg" disabled={loading}>
            <ShieldCheck className="w-5 h-5 text-[#B08A4A]" />
            <span>{loading ? 'Verifying Member Account...' : 'Sign In to Member Portal'}</span>
          </TouchButton>
        </div>
      </form>

      {/* Footer */}
      <div className="pb-4 text-center text-xs text-slate-400">
        <p>One Member Account • Website & Mobile App Connected</p>
        <p className="text-[10px] mt-1 text-[#B08A4A] font-semibold">Sunshine Eldercare Private Limited</p>
      </div>

      {/* Where is my ID Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-[#091329]">
              <HelpCircle className="w-6 h-6 text-[#B08A4A]" />
              <h3 className="font-serif font-bold text-lg">Finding Your Member ID</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your unique Member ID is automatically issued upon successful payment settlement on the Sunshine website.
            </p>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-[#091329]">Check the following locations:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your official payment receipt PDF (top-right header).</li>
                <li>Your Sunshine website member portal dashboard.</li>
                <li>Your email confirmation sent after payment.</li>
              </ul>
            </div>
            <p className="text-[11px] text-slate-500">
              Need assistance? Call Sunshine Care Desk at <span className="font-bold text-[#091329]">+91 90888 82222</span>.
            </p>
            <TouchButton
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowHelpModal(false)}
            >
              Close
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );
}
