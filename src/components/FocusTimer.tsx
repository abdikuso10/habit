"use client";

import { Check, Pause, Play } from "lucide-react";
import { formatHms } from "@/domain/timer";
import { useNowTick } from "@/hooks/useNowTick";
import { useTracker } from "@/providers/TrackerProvider";

/*
  Deliberate-practice research puts the sustainable daily ceiling at about
  three to four hours, reached in sessions of roughly 60-90 minutes rather
  than one long block, with beginners closer to one or two hours. The presets
  span that range so the choice is a considered one rather than a guess typed
  into a box.
*/
const PRESETS: [number, string][] = [
  [60, "1h"],
  [90, "1h 30m"],
  [120, "2h"],
  [180, "3h"],
  [240, "4h"],
];

export function FocusTimer() {
  const { state, today, getDayRecord, timer, startTimer, stopTimer, timerElapsedSeconds, setFocusTarget } =
    useTracker();
  const isRunning = timer?.kind === "focus";
  const now = useNowTick(isRunning);

  const habit = state?.habitsByPillar.mind.find((h) => h.id === "deepWork");
  const targetMinutes = habit?.metric.type === "duration" ? habit.metric.targetMinutes : state?.settings.focusTargetMinutes ?? 90;
  const targetSeconds = targetMinutes * 60;

  /*
    The habit's own target is what this timer measures against, so that is what
    the control below has to write — updating only the setting left the box
    editable and inert for anyone whose deepWork habit already existed: the
    number changed, the target didn't. `setFocusTarget` moves both in one write.

    The target is a whole-day total, not a per-session one: `focusSeconds`
    accumulates across every start and pause of the day, so a four-hour target
    is reached by several sessions rather than one unbroken sitting.
  */

  const committedSeconds = getDayRecord(today).focusSeconds ?? 0;
  const liveSeconds = isRunning ? timerElapsedSeconds(now) : 0;
  const displaySeconds = committedSeconds + liveSeconds;
  const done = displaySeconds >= targetSeconds;
  const pct = targetSeconds > 0 ? Math.min(100, Math.round((displaySeconds / targetSeconds) * 100)) : 0;
  const runningElsewhere = timer && timer.kind === "focus" && timer.dateKey !== today;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm text-parchment">Focus session</p>
        {done && (
          <span className="flex items-center gap-1 text-xs text-green">
            <Check size={12} strokeWidth={3} aria-hidden="true" /> target reached
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span dir="ltr" className="font-numeric text-2xl tabular-nums text-parchment" aria-live="off">
          {formatHms(displaySeconds)}
        </span>
        <span className="text-xs text-slate">/ {formatHms(targetSeconds)}</span>
        <button
          type="button"
          onClick={() => (isRunning ? stopTimer() : startTimer("focus", targetSeconds))}
          aria-label={isRunning ? "Pause focus timer" : "Start focus timer"}
          className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-parchment transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {isRunning ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
          {isRunning ? "Pause" : "Start"}
        </button>
      </div>

      {runningElsewhere && (
        <p className="mt-1.5 text-[11px] text-slate">Running since {timer.dateKey} — still counting for that day.</p>
      )}

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-night" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Focus session progress">
        <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-slate hover:text-parchment">Change target</summary>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="number"
            min={5}
            step={5}
            key={targetMinutes}
            defaultValue={targetMinutes}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (Number.isFinite(val) && val > 0) setFocusTarget(val);
            }}
            aria-label="Daily focus target in minutes"
            className="w-20 rounded-md border border-white/10 bg-night px-2 py-1 text-xs text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <span className="text-[11px] text-slate">minutes a day</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PRESETS.map(([minutes, label]) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setFocusTarget(minutes)}
              aria-pressed={targetMinutes === minutes}
              className={`min-h-7 rounded-md border px-2 py-0.5 text-[11px] transition ${
                targetMinutes === minutes
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-white/10 text-slate hover:text-parchment"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
