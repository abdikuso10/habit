"use client";

import { Flame } from "lucide-react";
import { computeDayLevels } from "@/domain/completion";
import { flattenHabits } from "@/domain/habits";
import { HabitLevel } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { AnimatedNumber } from "./AnimatedNumber";

const TIER_META: Record<HabitLevel, { label: string; color: string }> = {
  minimum: { label: "Minimum", color: "var(--color-slate)" },
  target: { label: "Target", color: "var(--color-green)" },
  stretch: { label: "Stretch", color: "var(--color-gold)" },
};

export function DayLevelProgress() {
  const { state, today, getDayRecord, streak } = useTracker();
  if (!state) return null;

  const habits = flattenHabits(state.habitsByPillar);
  const day = getDayRecord(today);
  const levels = computeDayLevels(habits, day, today);
  const isSpecial = Boolean(day.specialState && day.specialState !== "normal");

  return (
    <section aria-label="Today's progress" className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate">
            {isSpecial ? "Excused today" : levels.achievedTier ? `${TIER_META[levels.achievedTier].label} day` : "Just getting started"}
          </p>
          <p className="font-numeric text-2xl text-parchment">
            <AnimatedNumber value={levels.target.pct} suffix="%" />
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5">
          <Flame size={16} className={streak > 0 ? "text-gold" : "text-slate"} aria-hidden="true" />
          <span className="font-numeric text-sm text-parchment">
            <AnimatedNumber value={streak} />
          </span>
          <span className="text-xs text-slate">day{streak === 1 ? "" : "s"} streak</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {(["minimum", "target", "stretch"] as HabitLevel[]).map((tier) => {
          const t = levels[tier];
          if (t.scheduled === 0) return null;
          return (
            <div key={tier}>
              <div className="mb-1 flex justify-between text-xs text-slate">
                <span>{TIER_META[tier].label}</span>
                <span className="font-numeric">
                  {t.completed}/{t.scheduled}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={t.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${TIER_META[tier].label} tier progress`}
                className="h-2 w-full overflow-hidden rounded-full bg-night"
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${t.pct}%`, backgroundColor: TIER_META[tier].color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
