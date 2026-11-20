"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, BellRing, Volume1 } from "lucide-react";

export interface UnacknowledgedIncidentInfo {
  id: string;
  incidentNumber?: string;
  classification?: string;
  status?: string;
  acknowledgedAt?: string | Date | null;
}

export interface EmergencyAudioAlertProps {
  unacknowledgedIncidents?: UnacknowledgedIncidentInfo[];
  unacknowledgedCodeRedCount?: number;
  newIncidentIds?: string[];
}

export function EmergencyAudioAlert({
  unacknowledgedIncidents,
  unacknowledgedCodeRedCount = 0,
  newIncidentIds = [],
}: EmergencyAudioAlertProps) {
  const [muted, setMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // References for continuous repeating siren loop & immediate cancellation
  const unackIdsRef = useRef<Set<string>>(new Set());
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const currentOsc1Ref = useRef<OscillatorNode | null>(null);
  const currentOsc2Ref = useRef<OscillatorNode | null>(null);
  const currentMasterGainRef = useRef<GainNode | null>(null);
  const mutedRef = useRef<boolean>(false);

  // Load user mute preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("emergencyos_sound_muted");
      if (saved === "true") {
        setMuted(true);
        mutedRef.current = true;
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
   * a 1.2 kHz lowpass biquad filter with resonance (Q: 1.8) and 0.72 master gain.
   */
  const playAmbulanceCycle = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx || ctx.state !== "running") return;

      const now = ctx.currentTime;
      const toneDuration = 0.28; // 280ms per half-cycle
      const glideDuration = 0.025; // 25ms smooth glissando
      const totalDuration = toneDuration * 4; // 1.12s total duration (2 full Hi-Lo cycles)

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

      const highFreq = 660.0;
      const lowFreq = 495.0;

      // Osc 1 Frequency Automation
      osc1.frequency.setValueAtTime(highFreq, now);
      osc1.frequency.setValueAtTime(highFreq, now + toneDuration - glideDuration);
      osc1.frequency.linearRampToValueAtTime(lowFreq, now + toneDuration);
      osc1.frequency.setValueAtTime(lowFreq, now + toneDuration * 2 - glideDuration);
      osc1.frequency.linearRampToValueAtTime(highFreq, now + toneDuration * 2);
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

      currentMasterGainRef.current = masterGain;
      currentOsc1Ref.current = osc1;
      currentOsc2Ref.current = osc2;

      // Start & Stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + totalDuration + 0.05);
      osc2.stop(now + totalDuration + 0.05);
    } catch (e) {
      console.warn("[EmergencyAudio] Playback synthesis note:", e);
    }
  }, [getOrCreateAudioContext]);

  /**
   * Immediately stops any active audio cycle and clears future loop timeouts.
   */
  const stopLoopAndAudio = useCallback(() => {
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    isLoopRunningRef.current = false;

    const ctx = audioCtxRef.current;
    if (ctx && currentMasterGainRef.current) {
      try {
        const now = ctx.currentTime;
        currentMasterGainRef.current.gain.cancelScheduledValues(now);
        currentMasterGainRef.current.gain.setValueAtTime(
          currentMasterGainRef.current.gain.value,
          now
        );
        // Instant 20ms fade to eliminate speaker click/pop
        currentMasterGainRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.02);

        if (currentOsc1Ref.current) {
          currentOsc1Ref.current.stop(now + 0.03);
          currentOsc1Ref.current = null;
        }
        if (currentOsc2Ref.current) {
          currentOsc2Ref.current.stop(now + 0.03);
          currentOsc2Ref.current = null;
        }
      } catch {
        // Safe disposal
      }
    }
  }, []);

  /**
   * Executes one siren cycle and schedules the next repeat if unacknowledged incidents remain.
   */
  const runLoopStep = useCallback(() => {
    if (unackIdsRef.current.size === 0 || mutedRef.current) {
      stopLoopAndAudio();
      return;
    }

    isLoopRunningRef.current = true;
    playAmbulanceCycle();

    // Schedule next cycle (1.12s siren + 0.38s cadence breath = 1.50s loop cadence)
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
    }
    loopTimeoutRef.current = setTimeout(() => {
      runLoopStep();
    }, 1500);
  }, [playAmbulanceCycle, stopLoopAndAudio]);

  /**
   * Starts repeating siren loop safely without creating overlapping timers.
   */
  const startLoop = useCallback(() => {
    if (isLoopRunningRef.current) return; // Prevent duplicate overlapping loops across polling cycles
    if (mutedRef.current) return;
    if (unackIdsRef.current.size === 0) return;

    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === "running") {
            setAudioUnlocked(true);
            isLoopRunningRef.current = true;
            runLoopStep();
          }
        })
        .catch(() => {});
      return;
    }

    if (ctx && ctx.state === "running") {
      setAudioUnlocked(true);
      isLoopRunningRef.current = true;
      runLoopStep();
    }
  }, [getOrCreateAudioContext, runLoopStep]);

  // Handle user interaction to unlock browser autoplay restrictions (Brave, Chrome, Safari)
  useEffect(() => {
    const unlock = () => {
      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx
          .resume()
          .then(() => {
            if (ctx.state === "running") {
              setAudioUnlocked(true);
              if (unackIdsRef.current.size > 0 && !isLoopRunningRef.current && !mutedRef.current) {
                startLoop();
              }
            }
          })
          .catch(() => {});
      } else if (ctx && ctx.state === "running") {
        setAudioUnlocked(true);
        if (unackIdsRef.current.size > 0 && !isLoopRunningRef.current && !mutedRef.current) {
          startLoop();
        }
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
  }, [getOrCreateAudioContext, startLoop]);

  // Synchronise unacknowledged incidents with the active alert loop
  useEffect(() => {
    const activeIds = new Set<string>();

    if (unacknowledgedIncidents) {
      // Source of truth: server-provided unacknowledged incident objects
      for (const inc of unacknowledgedIncidents) {
        if (
          inc.id &&
          (inc.status === "TRIGGERED" || !inc.status) &&
          !inc.acknowledgedAt
        ) {
          activeIds.add(inc.id);
        }
      }
    } else if (newIncidentIds && newIncidentIds.length > 0 && unacknowledgedCodeRedCount > 0) {
      // Backward compatibility fallback
      for (const id of newIncidentIds.slice(0, unacknowledgedCodeRedCount)) {
        activeIds.add(id);
      }
    }

    unackIdsRef.current = activeIds;

    if (activeIds.size === 0) {
      // Rule 2 & 3: Stop the relevant audio loop immediately when incidents are acknowledged
      stopLoopAndAudio();
    } else {
      // Rule 1, 4 & 6: Start or maintain continuous repeating siren until all are acknowledged
      if (!isLoopRunningRef.current && !mutedRef.current) {
        startLoop();
      }
    }
  }, [
    unacknowledgedIncidents,
    newIncidentIds,
    unacknowledgedCodeRedCount,
    startLoop,
    stopLoopAndAudio,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
      isLoopRunningRef.current = false;
      try {
        if (currentOsc1Ref.current) {
          currentOsc1Ref.current.stop();
          currentOsc1Ref.current = null;
        }
        if (currentOsc2Ref.current) {
          currentOsc2Ref.current.stop();
          currentOsc2Ref.current = null;
        }
      } catch {}
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    try {
      localStorage.setItem("emergencyos_sound_muted", String(next));
    } catch {}

    if (next) {
      stopLoopAndAudio();
    } else {
      if (unackIdsRef.current.size > 0) {
        startLoop();
      }
    }
  };

  const handleManualEnableAudio = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        setAudioUnlocked(true);
        if (unackIdsRef.current.size > 0 && !mutedRef.current) {
          startLoop();
        }
      });
    }
  };

  // Derive counts for persistent visual alerts
  let unackCodeRedCount = 0;
  let unackCodeYellowCount = 0;

  if (unacknowledgedIncidents) {
    for (const inc of unacknowledgedIncidents) {
      if (inc.status === "TRIGGERED" || !inc.status) {
        if (inc.classification === "CODE_RED") unackCodeRedCount++;
        else if (inc.classification === "CODE_YELLOW") unackCodeYellowCount++;
      }
    }
  } else {
    unackCodeRedCount = unacknowledgedCodeRedCount;
  }

  const totalUnack = unackCodeRedCount + unackCodeYellowCount;

  return (
    <div className="flex items-center gap-2">
      {/* Persistent Visual Alert Indicator for Unacknowledged Code Red */}
      {unackCodeRedCount > 0 && (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full bg-red-600 text-white animate-pulse shadow-md">
          <BellRing className="w-3.5 h-3.5 animate-bounce" />
          <span>{unackCodeRedCount} CODE RED ACTIVE</span>
        </span>
      )}

      {/* Persistent Visual Alert Indicator for Unacknowledged Code Yellow */}
      {unackCodeYellowCount > 0 && (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full bg-amber-600 text-white animate-pulse shadow-md">
          <BellRing className="w-3.5 h-3.5 animate-bounce" />
          <span>{unackCodeYellowCount} CODE YELLOW ACTIVE</span>
        </span>
      )}

      {/* Browser Autoplay Prompt if Audio is Suspended */}
      {!audioUnlocked && !muted && totalUnack > 0 && (
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
            : totalUnack > 0
            ? "bg-red-50 text-red-600 border-red-300 hover:bg-red-100 ring-2 ring-red-400"
            : "bg-white text-emerald-600 border-slate-200 hover:bg-slate-50"
        }`}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
