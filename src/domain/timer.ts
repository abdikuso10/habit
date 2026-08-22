// Timers are timestamp-based, not interval-accumulation-based, so elapsed
// time survives refresh, tab switches, and the tab being backgrounded (where
// setInterval throttles or pauses). Elapsed is always `now - startedAt`.

import { RunningTimerState } from "@/persistence/types";

export function elapsedSeconds(timer: RunningTimerState, nowMs: number): number {
  const startedMs = new Date(timer.startedAt).getTime();
  const runningSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  return timer.accumulatedSeconds + runningSeconds;
}

export function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatMs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
