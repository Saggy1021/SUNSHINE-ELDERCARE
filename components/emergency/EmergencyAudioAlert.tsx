"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, BellRing, Volume1 } from "lucide-react";

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
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);
  const lastUnacknowledgedCountRef = useRef<number>(0);

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
        audioCtxRef.current
          .resume()
          .then(() => {
            if (audioCtxRef.current?.state === "running") {
              setAudioUnlocked(true);
            }
          })
          .catch(() => {});
      } else if (audioCtxRef.current.state === "running") {
        setAudioUnlocked(true);
      }

      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  /**
   * Recognisable ambulance-style two-tone emergency siren.
   * Alternating Hi-Lo siren pattern:
   *   High Tone: 660.0 Hz (E5)
   *   Low Tone:  495.0 Hz (B4)
   * Designed with warm triangle + soft harmonic overtone, shaped through
   * a 1.2 kHz lowpass biquad filter with resonance to eliminate harsh
   * high-frequency screech while sustaining strong, authoritative room loudness (0.72 master gain).
   */
  const playAmbulanceSiren = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;

      const triggerAudio = () => {
        try {
          const now = ctx.currentTime;
          const toneDuration = 0.28; // 280ms per half-cycle
          const glideDuration = 0.025; // 25ms smooth glissando
          const totalDuration = toneDuration * 4; // 2 full Hi-Lo cycles (1.12s)

          // Master Gain Node (Audible, room-filling loudness with smooth attack & release)
          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.001, now);
          masterGain.gain.linearRampToValueAtTime(0.72, now + 0.02);
          masterGain.gain.setValueAtTime(0.72, now + totalDuration - 0.05);
          masterGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

          // Lowpass Filter: Strips piercing high frequencies > 1.2 kHz while preserving siren body
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1200, now);
          filter.Q.setValueAtTime(1.8, now);

          // Primary Warm Oscillator (Triangle wave for rich brassy ambulance body)
          const osc1 = ctx.createOscillator();
          osc1.type = "triangle";

          // Secondary Harmonic Oscillator (Soft sine overtone 1 octave higher at 15% mix for acoustic depth)
          const osc2 = ctx.createOscillator();
          osc2.type = "sine";
          const osc2Gain = ctx.createGain();
          osc2Gain.gain.setValueAtTime(0.15, now);

          // Hi-Lo Frequency Pattern:
          // Phase 1 (0.00 - 0.28s): High Tone 660 Hz
          // Phase 2 (0.28 - 0.56s): Low Tone 495 Hz
          // Phase 3 (0.56 - 0.84s): High Tone 660 Hz
          // Phase 4 (0.84 - 1.12s): Low Tone 495 Hz
          const highFreq = 660.0;
          const lowFreq = 495.0;

          // Osc 1 Frequency Automation
          osc1.frequency.setValueAtTime(highFreq, now);
          // Glide to Low
          osc1.frequency.setValueAtTime(highFreq, now + toneDuration - glideDuration);
          osc1.frequency.linearRampToValueAtTime(lowFreq, now + toneDuration);
          // Glide back to High
          osc1.frequency.setValueAtTime(lowFreq, now + toneDuration * 2 - glideDuration);
          osc1.frequency.linearRampToValueAtTime(highFreq, now + toneDuration * 2);
          // Glide back to Low
          osc1.frequency.setValueAtTime(highFreq, now + toneDuration * 3 - glideDuration);
          osc1.frequency.linearRampToValueAtTime(lowFreq, now + toneDuration * 3);

          // Osc 2 (Overtone) Frequency Automation (1 octave higher)
          osc2.frequency.setValueAtTime(highFreq * 2, now);
          osc2.frequency.setValueAtTime(highFreq * 2, now + toneDuration - glideDuration);
          osc2.frequency.linearRampToValueAtTime(lowFreq * 2, now + toneDuration);
          osc2.frequency.setValueAtTime(lowFreq * 2, now + toneDuration * 2 - glideDuration);
          osc2.frequency.linearRampToValueAtTime(highFreq * 2, now + toneDuration * 2);
          osc2.frequency.setValueAtTime(highFreq * 2, now + toneDuration * 3 - glideDuration);
          osc2.frequency.linearRampToValueAtTime(lowFreq * 2, now + toneDuration * 3);

          // Connections
          osc1.connect(filter);
          osc2.connect(osc2Gain);
          osc2Gain.connect(filter);
          filter.connect(masterGain);
          masterGain.connect(ctx.destination);

          // Start & Stop
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + totalDuration + 0.05);
          osc2.stop(now + totalDuration + 0.05);
        } catch (innerErr) {
          console.warn("[EmergencyAudio] Playback synthesis note:", innerErr);
        }
      };

      if (ctx.state === "suspended") {
        ctx
          .resume()
          .then(() => {
            setAudioUnlocked(true);
            triggerAudio();
          })
          .catch(() => {});
      } else {
        setAudioUnlocked(true);
        triggerAudio();
      }
    } catch (e) {
      console.warn("[EmergencyAudio] Siren playback exception:", e);
    }
  }, [muted, getOrCreateAudioContext]);

  // Handle user interaction to unlock browser autoplay restrictions (Brave, Chrome, Safari)
  useEffect(() => {
    const unlock = () => {
      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx
          .resume()
          .then(() => setAudioUnlocked(true))
          .catch(() => {});
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
    window.addEventListener("focus", unlock);

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", unlock);
    };
  }, [getOrCreateAudioContext]);

  // Trigger alert sound for GENUINELY NEW incoming emergencies
  useEffect(() => {
    if (unacknowledgedCodeRedCount === 0) {
      lastUnacknowledgedCountRef.current = 0;
      isInitialMountRef.current = false;
      return;
    }

    // Determine if any genuinely new unacknowledged incident ID arrived
    let hasBrandNewIncident = false;
    if (newIncidentIds && newIncidentIds.length > 0) {
      for (const id of newIncidentIds) {
        if (!alertedIdsRef.current.has(id)) {
          alertedIdsRef.current.add(id);
          hasBrandNewIncident = true;
        }
      }
    }

    // Also check if count increased (fallback if IDs not passed)
    const countIncreased =
      unacknowledgedCodeRedCount > lastUnacknowledgedCountRef.current;
    lastUnacknowledgedCountRef.current = unacknowledgedCodeRedCount;

    // Trigger on initial mount if unacknowledged Code Red exists, or on newly received incidents
    if (isInitialMountRef.current || hasBrandNewIncident || countIncreased) {
      isInitialMountRef.current = false;
      playAmbulanceSiren();
    }
  }, [unacknowledgedCodeRedCount, newIncidentIds, playAmbulanceSiren]);

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
          playAmbulanceSiren();
        });
      } else {
        playAmbulanceSiren();
      }
    }
  };

  const handleManualEnableAudio = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        setAudioUnlocked(true);
        playAmbulanceSiren();
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Persistent Visual Alert Indicator for Unacknowledged Code Reds (Audio Fallback) */}
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
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-sm cursor-pointer"
          title="Click to unlock emergency siren audio in browser"
        >
          <Volume1 className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
          <span>Enable Alert Sound</span>
        </button>
      )}

      {/* Mute / Unmute Toggle Button */}
      <button
        type="button"
        onClick={toggleMute}
        title={muted ? "Unmute Emergency Alert Sound" : "Mute Emergency Alert Sound"}
        className={`p-2 rounded-lg border transition-all shadow-sm cursor-pointer ${
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
