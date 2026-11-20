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
  };

  const playChime = useCallback(() => {
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

      // Generate urgent dual-tone emergency pulse (880Hz -> 660Hz)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.15);
      osc.frequency.setValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch {
      // Audio context might be restricted before first user interaction
    }
  }, [muted]);

  useEffect(() => {
    if (unacknowledgedCodeRedCount > 0 && !muted) {
      // Play immediately
      playChime();
      // Repeat alert pulse every 4 seconds until acknowledged
      intervalRef.current = setInterval(() => {
        playChime();
      }, 4000);
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
  }, [unacknowledgedCodeRedCount, muted, playChime]);

  return (
    <div className="flex items-center gap-2">
      {unacknowledgedCodeRedCount > 0 && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-red-600 text-white animate-pulse shadow-sm">
          <BellRing className="w-3.5 h-3.5 animate-bounce" />
          {unacknowledgedCodeRedCount} CODE RED ALERT
        </span>
      )}
      <button
        type="button"
        onClick={toggleMute}
        title={muted ? "Unmute Emergency Alerts" : "Mute Emergency Alerts"}
        className={`p-1.5 rounded-lg border transition-colors ${
          muted
            ? "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            : unacknowledgedCodeRedCount > 0
            ? "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
            : "bg-slate-800 text-emerald-400 border-slate-700 hover:text-emerald-300"
        }`}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
