"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, BellRing } from "lucide-react";

interface EmergencyAudioAlertProps {
  unacknowledgedCodeRedCount: number;
}

export function EmergencyAudioAlert({
  unacknowledgedCodeRedCount,
}: EmergencyAudioAlertProps) {
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("emergencyos_sound_muted");
    if (saved === "true") {
      setMuted(true);
    }
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("emergencyos_sound_muted", String(next));
    if (!next && audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  // High-intensity piercing dual-harmonic emergency siren with dynamic compression
  const playPiercingEmergencyAlert = useCallback(() => {
    if (muted) return;
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Dynamics Compressor to maximize perceived loudness without clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, now);
      compressor.knee.setValueAtTime(30, now);
      compressor.ratio.setValueAtTime(12, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.2, now);
      compressor.connect(ctx.destination);

      // 2. Master Gain (0.85 peak)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.connect(compressor);

      // Play 3 urgent emergency siren pulses: [Pulse 1, Pulse 2, Pulse 3]
      const pulses = [
        { start: now + 0.0, end: now + 0.22, freq1: 960, freq2: 1440 },
        { start: now + 0.28, end: now + 0.50, freq1: 770, freq2: 1155 },
        { start: now + 0.56, end: now + 0.85, freq1: 960, freq2: 1440 },
      ];

      pulses.forEach((p) => {
        // Primary Sawtooth Oscillator (Rich upper harmonics for high intelligibility on laptop speakers)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(p.freq1, p.start);

        gain1.gain.setValueAtTime(0.001, p.start);
        gain1.gain.exponentialRampToValueAtTime(0.85, p.start + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, p.end - 0.01);

        osc1.connect(gain1);
        gain1.connect(masterGain);

        osc1.start(p.start);
        osc1.stop(p.end);

        // Secondary Square-Wave Harmonic Oscillator for acoustic piercing power
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "square";
        osc2.frequency.setValueAtTime(p.freq2, p.start);

        gain2.gain.setValueAtTime(0.001, p.start);
        gain2.gain.exponentialRampToValueAtTime(0.35, p.start + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, p.end - 0.01);

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc2.start(p.start);
        osc2.stop(p.end);
      });

      // Master envelope open for the burst duration
      masterGain.gain.setValueAtTime(1.0, now);
      masterGain.gain.setValueAtTime(1.0, now + 0.86);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.90);
    } catch {
      // Audio context may be restricted prior to first user gesture
    }
  }, [muted]);

  useEffect(() => {
    // Unlock Web Audio on first user interaction in case browser policy blocked autoplay
    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (unacknowledgedCodeRedCount > 0 && !muted) {
      // Play immediately, then repeat every 2.5 seconds until acknowledged or muted
      playPiercingEmergencyAlert();
      intervalRef.current = setInterval(() => {
        playPiercingEmergencyAlert();
      }, 2500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [unacknowledgedCodeRedCount, muted, playPiercingEmergencyAlert]);

  return (
    <div className="flex items-center gap-2">
      {unacknowledgedCodeRedCount > 0 && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-red-600 text-white animate-pulse shadow-sm">
          <BellRing className="w-3.5 h-3.5 animate-bounce" />
          {unacknowledgedCodeRedCount} CODE RED
        </span>
      )}
      <button
        type="button"
        onClick={toggleMute}
        title={muted ? "Unmute Emergency Alerts" : "Mute Emergency Alerts"}
        className={`p-1.5 rounded-lg border transition-colors shadow-sm ${
          muted
            ? "bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50"
            : unacknowledgedCodeRedCount > 0
            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 ring-2 ring-red-500 animate-pulse"
            : "bg-white text-emerald-600 border-slate-200 hover:bg-slate-50"
        }`}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
