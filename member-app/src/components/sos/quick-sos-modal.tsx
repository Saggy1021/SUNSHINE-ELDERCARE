'use client';

import React, { useState } from 'react';
import { Phone, AlertTriangle, X, ShieldAlert, MapPin, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { SessionStore } from '@/lib/session-store';

interface QuickSosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSosModal({ isOpen, onClose }: QuickSosModalProps) {
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<any>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  if (!isOpen) return null;

  const session = SessionStore.getSession();
  const emergencyPhone = session?.profile?.emergencyContactPhone || '+91 90888 82222';
  const emergencyName = session?.profile?.emergencyContactName || 'Designated Family Contact';

  const handleSendDigitalAlert = async () => {
    setSendingAlert(true);
    setAlertError(null);

    let coords: { latitude?: number; longitude?: number; accuracy?: number } = {};

    // Attempt to retrieve browser GNSS coordinates if allowed
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000,
          });
        });
        coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch {
        // Geolocation denied or timed out — proceed with alert without GPS
      }
    }

    try {
      const res = await api.triggerSos(coords);
      if (res.success) {
        setAlertSuccess(res);
      }
    } catch (err: any) {
      setAlertError(err?.message || 'Emergency SOS signal could not be transmitted. Please call our 24/7 Helpline immediately.');
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#091329]/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-red-200 animate-in slide-in-from-bottom-6 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-[#DC2626]">
            <div className="p-2 bg-red-100 rounded-full animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Emergency SOS</h2>
              <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Sunshine Rapid Response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {alertSuccess ? (
          <div className="my-6 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-emerald-950">SOS Signal Confirmed</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">{alertSuccess.message}</p>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900 font-mono font-bold">
              Alert ID: {alertSuccess.alertId}
            </div>
            <a
              href={`tel:${alertSuccess.helpline}`}
              className="w-full p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>Call Care Desk Now: {alertSuccess.helpline}</span>
            </a>
          </div>
        ) : (
          <div className="space-y-3.5 my-6">
            {alertError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{alertError}</span>
              </div>
            )}

            {/* Send Digital Distress Signal with Server Verification */}
            <button
              onClick={handleSendDigitalAlert}
              disabled={sendingAlert}
              className="w-full p-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm flex items-center justify-between shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  {sendingAlert ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold">Send Digital SOS Alert</p>
                  <p className="text-[11px] text-red-100 font-normal">Notifies Sunshine Emergency Operations Desk</p>
                </div>
              </div>
              <span className="bg-white text-red-700 text-xs px-2.5 py-1 rounded-full uppercase font-bold">
                {sendingAlert ? 'Sending...' : 'Trigger'}
              </span>
            </button>

            {/* 1. Sunshine 24x7 Direct Helpline */}
            <a
              href="tel:+919088882222"
              className="flex items-center justify-between p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl active:scale-[0.98] transition-transform text-[#091329]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-red-950">Sunshine 24/7 Care Helpline</p>
                  <p className="text-xs text-red-700 font-mono font-semibold">+91 90888 82222</p>
                </div>
              </div>
              <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Call</span>
            </a>

            {/* 2. Designated Emergency Contact */}
            <a
              href={`tel:${emergencyPhone}`}
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl active:scale-[0.98] transition-transform text-[#091329]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#162850] text-[#D8C08A] rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">{emergencyName}</p>
                  <p className="text-xs text-slate-500 font-mono">{emergencyPhone}</p>
                </div>
              </div>
              <span className="bg-[#162850] text-[#D8C08A] text-xs font-bold px-3 py-1 rounded-full uppercase">Call</span>
            </a>
          </div>
        )}

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 flex items-start gap-2 text-[11px] text-amber-900">
          <AlertTriangle className="w-4 h-4 text-[#B08A4A] shrink-0 mt-0.5" />
          <p>
            Emergency coordination is managed directly by Sunshine senior operators in accordance with certified emergency protocols.
          </p>
        </div>
      </div>
    </div>
  );
}
