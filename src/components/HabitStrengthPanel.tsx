"use client";

import { REPETITIONS_TO_ASYMPTOTE, stageLabel } from "@/domain/automaticity";
import { useTracker } from "@/providers/TrackerProvider";

/*
  How close each habit is to running on its own.

  Consistency ("you did this 62% of the time") measures compliance. It doesn't
  say whether the behaviour is becoming automatic, which is the thing you're
  actually trying to buy. Automaticity rises along an asymptotic curve with
  context-consistent repetition, so a habit at 30 repetitions and one at 3 are
  in genuinely different places even at the same completion rate.

  The honesty note below the list is not boilerplate — real automaticity is
  self-reported, and this app never asks. The number is a projection onto a
  published median curve, and it says so on the screen where it's used.
*/

export function HabitStrengthPanel() {
  const { habitStrengths } = useTracker();
  const started = habitStrengths.filter((s) => s.opportunities > 0);

  if (started.length === 0) return null;

  return (
    <section aria-labelledby="strength-heading" className="rounded-2xl border border-hairline bg-panel p-5">
      <h2 id="strength-heading" className="font-display text-lg text-parchment">
        Habit strength
      </h2>
      <p className="mt-1 max-w-prose text-sm text-slate">
        How far along the habit-formation curve each one is — not how often you did it, but how close it is to
        happening without deciding to.
      </p>

      <ul className="mt-4 space-y-3">
        {started.map((strength) => (
          <li key={strength.habitId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm text-parchment">{strength.label}</p>
              <p className="text-xs text-slate">
                {stageLabel(strength.stage)}{" "}
                <span className="numeric text-faint">· {strength.strengthPct}%</span>
              </p>
            </div>

            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunk"
              role="progressbar"
              aria-label={`${strength.label} habit strength`}
              aria-valuenow={strength.strengthPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${strength.strengthPct}%`,
                  background:
                    strength.strengthPct >= 85 ? "var(--kept)" : "var(--hour-dhuhr)",
                }}
              />
            </div>

            <p className="mt-1 text-[11px] text-faint">
              <span className="numeric">{strength.repetitions}</span> of{" "}
              <span className="numeric">{strength.opportunities}</span> opportunities kept
              {strength.projectedDaysToAutomatic !== null && (
                <>
                  {" · about "}
                  <span className="numeric">{strength.projectedDaysToAutomatic}</span> more days at this rate
                </>
              )}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-prose border-t border-hairline pt-3 text-[11px] leading-relaxed text-faint">
        This is a projection, not a measurement. Real automaticity is assessed by self-report, and this app never
        asks you to rate anything. The curve is Lally et al. (2010), where the median time to reach 95% of
        automaticity was <span className="numeric">{REPETITIONS_TO_ASYMPTOTE}</span> days of consistent
        repetition — but individual results in that study ranged from 18 to 254 days, so treat the figure as a
        direction of travel rather than a deadline.
      </p>
    </section>
  );
}
