"use client";

import { useMemo } from "react";
import { addDays, daysBetween, formatShortDate } from "@/lib/date";
import { useTracker } from "@/lib/TrackerContext";

function tileClasses(pct: number, isFuture: boolean, isToday: boolean) {
  const classes: string[] = ["rounded-[3px]", "border"];

  if (isFuture) {
    classes.push("bg-night", "border-white/5", "opacity-40");
  } else if (pct >= 100) {
    classes.push("bg-gold", "border-gold/60");
  } else if (pct >= 70) {
    classes.push("bg-green", "border-green/70");
  } else if (pct >= 40) {
    classes.push("bg-green/55", "border-green/40");
  } else if (pct >= 1) {
    classes.push("bg-green/25", "border-green/20");
  } else {
    classes.push("bg-night", "border-white/10");
  }

  if (isToday) {
    classes.push("ring-2", "ring-gold", "ring-offset-1", "ring-offset-panel");
  }

  return classes.join(" ");
}

export function YearGrid() {
  const { state, today, getCompletionPct } = useTracker();

  const days = useMemo(() => {
    if (!state) return [];
    return Array.from({ length: 365 }, (_, i) => {
      const dateKey = addDays(state.dayOneDate, i);
      const isFuture = daysBetween(today, dateKey) > 0;
      const isToday = dateKey === today;
      const pct = isFuture ? 0 : getCompletionPct(dateKey);
      return { dayNumber: i + 1, dateKey, pct, isFuture, isToday };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dayOneDate, state?.days, today]);

  if (!state) return null;

  return (
    <section aria-label="365-day progress grid">
      <h2 className="font-display text-lg text-parchment mb-3">The year</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-panel p-5">
        <div
          className="grid w-max gap-[3px]"
          style={{
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
            gridAutoColumns: "11px",
          }}
        >
          {days.map((day) => (
            <div key={day.dateKey} className="group relative">
              <div
                className={tileClasses(day.pct, day.isFuture, day.isToday)}
                style={{ width: 11, height: 11 }}
              />
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-night px-2 py-1 text-xs text-parchment opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
              >
                Day {day.dayNumber} · {formatShortDate(day.dateKey)} ·{" "}
                {day.isFuture ? "—" : `${day.pct}%`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
