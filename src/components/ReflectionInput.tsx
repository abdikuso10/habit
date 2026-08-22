"use client";

import { useState } from "react";
import { computeDayLevels } from "@/domain/completion";
import { flattenHabits } from "@/domain/habits";
import { supportiveMessage } from "@/domain/specialDays";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useTracker } from "@/providers/TrackerProvider";

export function ReflectionInput() {
  const { state, today, getDayRecord, setReflection } = useTracker();
  const day = getDayRecord(today);
  const [value, setValue] = useState(() => day.reflection ?? "");
  const commit = useDebouncedCallback((text: string) => setReflection(today, text), 600);

  if (!state) return null;
  const habits = flattenHabits(state.habitsByPillar);
  const levels = computeDayLevels(habits, day, today);
  const isSpecial = Boolean(day.specialState && day.specialState !== "normal");

  const message = isSpecial
    ? supportiveMessage("special")
    : levels.achievedTier === "stretch"
      ? supportiveMessage("stretch")
      : levels.achievedTier === "target"
        ? supportiveMessage("target")
        : levels.achievedTier === "minimum"
          ? supportiveMessage("minimum")
          : supportiveMessage("low");

  return (
    <section aria-label="End-of-day reflection" className="rounded-2xl border border-white/10 bg-panel p-5">
      <h2 className="font-display text-lg text-parchment">Reflection</h2>
      <p className="mt-1 text-sm text-gold">{message}</p>
      <label htmlFor="reflection" className="sr-only">
        End of day reflection
      </label>
      <textarea
        id="reflection"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          commit(e.target.value);
        }}
        placeholder="How did today go? What will you carry into tomorrow?"
        rows={3}
        className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </section>
  );
}
