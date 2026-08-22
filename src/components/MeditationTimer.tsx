"use client";

import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { formatMs } from "@/domain/timer";
import { useNowTick } from "@/hooks/useNowTick";
import { useTracker } from "@/providers/TrackerProvider";

export function MeditationTimer() {
  const { state, today, getDayRecord, timer, startTimer, stopTimer, timerElapsedSeconds, updateSettings } = useTracker();
  const isRunning = timer?.kind === "meditation";
  const now = useNowTick(isRunning);

  const done = Boolean(getDayRecord(today).habits.meditation);
  const label = state?.habitsByPillar.mind.find((h) => h.id === "meditation")?.label ?? "Meditation";
  const defaultMinutes = state?.settings.meditationDefaultMinutes ?? 10;
  const presets = Array.from(new Set([5, defaultMinutes, 15])).sort((a, b) => a - b);

  const targetSeconds = timer?.targetSeconds ?? defaultMinutes * 60;
  const elapsed = isRunning ? timerElapsedSeconds(now) : 0;
  const secondsLeft = Math.max(0, targetSeconds - elapsed);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm text-parchment">{label}</p>
        {done && (
          <span className="flex items-center gap-1 text-xs text-green">
            <Check size={12} strokeWidth={3} aria-hidden="true" /> done today
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        {presets.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => {
              if (!isRunning) updateSettings({ meditationDefaultMinutes: min });
            }}
            disabled={isRunning}
            aria-pressed={defaultMinutes === min}
            className={`min-h-8 rounded-md border px-2 py-1 text-xs transition disabled:opacity-40 ${
              defaultMinutes === min ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate hover:text-parchment"
            }`}
          >
            {min}m
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span dir="ltr" className="font-numeric text-2xl tabular-nums text-parchment" aria-live="off">
          {formatMs(secondsLeft)}
        </span>
        <button
          type="button"
          onClick={() => (isRunning ? stopTimer() : startTimer("meditation", defaultMinutes * 60))}
          disabled={!isRunning && secondsLeft === 0}
          aria-label={isRunning ? "Pause meditation timer" : "Start meditation timer"}
          className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-parchment transition hover:border-white/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {isRunning ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
          {isRunning ? "Pause" : "Start"}
        </button>
        {isRunning && (
          <button
            type="button"
            onClick={stopTimer}
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Stop &amp; save
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {secondsLeft === 0 && isRunning ? "Meditation session complete." : ""}
      </p>
    </div>
  );
}
