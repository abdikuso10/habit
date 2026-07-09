"use client";

import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTracker } from "@/lib/TrackerContext";

const PRESETS_MIN = [5, 10, 15];

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MeditationTimer() {
  const { state, today, getDayRecord, setHabitDone } = useTracker();
  const done = Boolean(getDayRecord(today).habits.meditation);
  const label =
    state?.habitsByPillar.mind.find((h) => h.id === "meditation")?.label ??
    "Meditation";

  const [durationMin, setDurationMin] = useState(PRESETS_MIN[0]);
  const [secondsLeft, setSecondsLeft] = useState(PRESETS_MIN[0] * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Reacting to the countdown reaching zero (an external clock, not derived
  // render state) so completion is recorded exactly once when it happens.
  useEffect(() => {
    if (secondsLeft !== 0 || !running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRunning(false);
    setHabitDone(today, "meditation");
  }, [secondsLeft, running, setHabitDone, today]);

  function selectDuration(min: number) {
    setDurationMin(min);
    setSecondsLeft(min * 60);
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(durationMin * 60);
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm text-parchment">{label}</p>
        {done && (
          <span className="flex items-center gap-1 text-xs text-green">
            <Check size={12} strokeWidth={3} /> done today
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {PRESETS_MIN.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => selectDuration(min)}
            disabled={running}
            className={`rounded-md border px-2 py-1 text-xs transition disabled:opacity-40 ${
              durationMin === min
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-white/10 text-slate hover:text-parchment"
            }`}
          >
            {min}m
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-numeric text-2xl text-parchment tabular-nums">
          {formatClock(secondsLeft)}
        </span>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          disabled={secondsLeft === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-parchment transition hover:border-white/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {running ? (
            <Pause size={13} aria-hidden="true" />
          ) : (
            <Play size={13} aria-hidden="true" />
          )}
          {running ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  );
}
