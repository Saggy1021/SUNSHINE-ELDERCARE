"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, BellRing, Sparkles, Volume1 } from "lucide-react";

interface EmergencyAudioAlertProps {
  unacknowledgedCodeRedCount: number;
  newIncidentIds?: string[];
}

export function EmergencyAudioAlert({
  unacknowledgedCodeRedCount,
  newIncidentIds = [],
}: EmergencyAudioAlertProps) {
  const [muted, setMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastAlertedCountRef = useRef<number>(0);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Load user mute preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("emergencyos_sound_muted");
      if (saved === "true") {
        setMuted(true);
      }
    } catch {
      // Storage access safety
    }
  }, []);

  const getOrCreateAudioContext = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().then(() => {
          setAudioUnlocked(true);
        }).catch(() => {});
      } else if (audioCtxRef.current.state === "running") {
        setAudioUnlocked(true);
      }

      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Soft, distinctive two-tone harmonic emergency chime
  // Tone 1: 587.33 Hz (D5) - warm sine wave
  // Tone 2: 880.00 Hz (A5) - clear melodic interval
  const playSoftEmergencyChime = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx || ctx.state !== "running") return;

      const now = ctx.currentTime;

      // Master gain for controlled, non-piercing volume (0.28 peak)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.connect(ctx.destination);

      // --- Tone 1 (D5: 587.3 Hz) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.17);

      // --- Tone 2 (A5: 880 Hz) - starts shortly after tone 1 for an elegant urgent chime ---
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.14);

      gain2.gain.setValueAtTime(0.001, now + 0.14);
      gain2.gain.linearRampToValueAtTime(0.28, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.40);

      // Master envelope
      masterGain.gain.setValueAtTime(1.0, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    } catch (e) {
      // Audio errors must never interrupt UI or incident rendering
      console.warn("[EmergencyAudio] Chime playback note:", e);
    }
  }, [muted, getOrCreateAudioContext]);

  // Handle user interaction to unlock browser autoplay restrictions
  useEffect(() => {
    const unlock = () => {
      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => setAudioUnlocked(true)).catch(() => {});
      } else if (ctx && ctx.state === "running") {
        setAudioUnlocked(true);
      }
    };

    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        unlock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [getOrCreateAudioContext]);

  // Play alert selectively for NEW incidents or NEW unacknowledged Code Reds
  useEffect(() => {
    // Check if new specific incidents arrived
    let hasNewIncident = false;
    if (newIncidentIds && newIncidentIds.length > 0) {
      for (const id of newIncidentIds) {
        if (!alertedIdsRef.current.has(id)) {
          alertedIdsRef.current.add(id);
          hasNewIncident = true;
        }
      }
    }

    // Or if unacknowledged Code Red count increased
    const countIncreased = unacknowledgedCodeRedCount > lastAlertedCountRef.current;
    lastAlertedCountRef.current = unacknowledgedCodeRedCount;

    if ((hasNewIncident || countIncreased) && unacknowledgedCodeRedCount > 0 && !muted) {
      playSoftEmergencyChime();
    }
  }, [unacknowledgedCodeRedCount, newIncidentIds, muted, playSoftEmergencyChime]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem("emergencyos_sound_muted", String(next));
    } catch {}

    if (!next) {
      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => {
          setAudioUnlocked(true);
          playSoftEmergencyChime();
        });
      } else {
        playSoftEmergencyChime();
      }
    }
  };

  const handleManualEnableAudio = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        setAudioUnlocked(true);
        playSoftEmergencyChime();
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Persistent Visual Alert Indicator for Unacknowledged Code Reds */}
      {unacknowledgedCodeRedCount > 0 && (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full bg-red-600 text-white animate-pulse shadow-md">
          <BellRing className="w-3.5 h-3.5 animate-bounce" />
          <span>{unacknowledgedCodeRedCount} CODE RED ACTIVE</span>
        </span>
      )}

      {/* Browser Autoplay Prompt if Audio is Still Suspended */}
      {!audioUnlocked && !muted && (
        <button
          type="button"
          onClick={handleManualEnableAudio}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-sm"
          title="Click once to enable browser emergency audio alerts"
        >
          <Volume1 className="w-3.5 h-3.5 text-amber-700" />
          <span>Enable Alert Sound</span>
        </button>
      )}

      {/* Mute / Unmute Toggle Button */}
      <button
        type="button"
        onClick={toggleMute}
        title={muted ? "Unmute Emergency Alert Sound" : "Mute Emergency Alert Sound"}
        className={`p-2 rounded-lg border transition-all shadow-sm ${
          muted
            ? "bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-200"
            : unacknowledgedCodeRedCount > 0
            ? "bg-red-50 text-red-600 border-red-300 hover:bg-red-100 ring-2 ring-red-400"
            : "bg-white text-emerald-600 border-slate-200 hover:bg-slate-50"
        }`}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
