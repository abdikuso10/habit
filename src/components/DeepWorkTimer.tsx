"use client";

import { Check, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DEEP_WORK_TARGET_SECONDS } from "@/lib/types";
import { useTracker } from "@/lib/TrackerContext";

const FLUSH_INTERVAL_MS = 10_000;

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

export function DeepWorkTimer() {
  const { today, getDayRecord, addDeepWorkSeconds } = useTracker();
  const committedSeconds = getDayRecord(today).deepWorkSeconds ?? 0;
  const done = committedSeconds >= DEEP_WORK_TARGET_SECONDS;

  const [running, setRunning] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  // Ticks the display every second and periodically commits elapsed time
  // into persisted state, so a session survives a crash/close mid-run.
  // Cleanup fires on pause (running flips false) and on unmount alike,
  // committing whatever's accumulated since the last flush either way.
  useEffect(() => {
    if (!running) return;

    const flush = (updateDisplay: boolean) => {
      if (startRef.current === null) return;
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      if (elapsed > 0) addDeepWorkSeconds(today, elapsed);
      startRef.current = Date.now();
      if (updateDisplay) setLiveElapsed(0);
    };

    const displayTick = setInterval(() => {
      if (startRef.current !== null) {
        setLiveElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    const flushTick = setInterval(() => flush(true), FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(displayTick);
      clearInterval(flushTick);
      flush(false);
    };
  }, [running, today, addDeepWorkSeconds]);

  const displaySeconds = committedSeconds + liveElapsed;
  const pct = Math.min(
    100,
    Math.round((displaySeconds / DEEP_WORK_TARGET_SECONDS) * 100)
  );

  function handleToggle() {
    if (running) {
      setRunning(false);
    } else {
      startRef.current = Date.now();
      setLiveElapsed(0);
      setRunning(true);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm text-parchment">Deep work</p>
        {done && (
          <span className="flex items-center gap-1 text-xs text-green">
            <Check size={12} strokeWidth={3} /> 4 hours reached
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-numeric text-2xl text-parchment tabular-nums">
          {formatDuration(displaySeconds)}
        </span>
        <span className="text-xs text-slate">/ 04:00:00</span>
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-parchment transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {running ? (
            <Pause size={13} aria-hidden="true" />
          ) : (
            <Play size={13} aria-hidden="true" />
          )}
          {running ? "Pause" : "Start"}
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-night">
        <div
          className="h-full rounded-full bg-green transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
