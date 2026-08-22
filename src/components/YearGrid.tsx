"use client";

import { useMemo } from "react";
import { completionPct } from "@/domain/completion";
import { addDays, daysBetween, formatShortDate, getJourneyWindow } from "@/domain/date";
import { flattenHabits } from "@/domain/habits";
import { commitmentsKeptOn } from "@/domain/commitments";
import { useTracker } from "@/providers/TrackerProvider";

function tileClasses(pct: number, isFuture: boolean, isToday: boolean, isSpecial: boolean) {
  const classes: string[] = ["rounded-[3px]", "border"];

  if (isFuture) {
    classes.push("bg-night", "border-white/5", "opacity-40");
  } else if (isSpecial) {
    classes.push("bg-slate/30", "border-slate/50");
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
  const { state, today } = useTracker();

  const days = useMemo(() => {
    if (!state) return [];
    const habits = flattenHabits(state.habitsByPillar);
    const { totalDays } = getJourneyWindow(state.dayOneDate, today);
    return Array.from({ length: totalDays }, (_, i) => {
      const dateKey = addDays(state.dayOneDate, i);
      const isFuture = daysBetween(today, dateKey) > 0;
      const isToday = dateKey === today;
      const day = state.days[dateKey];
      const pct = isFuture ? 0 : completionPct(habits, day, dateKey);
      const isSpecial = Boolean(day?.specialState && day.specialState !== "normal");
      const keptCount = commitmentsKeptOn(state.commitments, dateKey).length;
      return { dayNumber: i + 1, dateKey, pct, isFuture, isToday, isSpecial, keptCount };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dayOneDate, state?.days, state?.commitments, today]);

  if (!state) return null;

  return (
    <section aria-label="Journey progress grid">
      <h2 className="font-display text-lg text-parchment mb-3">The journey</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-panel p-5">
        <div
          aria-hidden="true"
          className="grid w-max gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, 11px)", gridAutoFlow: "column", gridAutoColumns: "11px" }}
        >
          {days.map((day) => (
            <div key={day.dateKey} className="group relative">
              <div className={tileClasses(day.pct, day.isFuture, day.isToday, day.isSpecial)} style={{ width: 11, height: 11 }} />
              {day.keptCount > 0 && !day.isFuture && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-gold"
                />
              )}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-night px-2 py-1 text-xs text-parchment opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
              >
                Day {day.dayNumber} · {formatShortDate(day.dateKey)} ·{" "}
                {day.isFuture ? "—" : day.isSpecial ? "excused" : `${day.pct}%`}
                {day.keptCount > 0 ? ` · ${day.keptCount} promise${day.keptCount === 1 ? "" : "s"} kept` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-slate hover:text-parchment">
          View the year as a list (text alternative to the grid above)
        </summary>
        <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-white/10 bg-night p-3 text-xs text-slate">
          {days
            .filter((d) => !d.isFuture)
            .map((d) => (
              <li key={d.dateKey}>
                Day {d.dayNumber} ({formatShortDate(d.dateKey)}): {d.isSpecial ? "excused" : `${d.pct}%`}
                {d.keptCount > 0 ? `, ${d.keptCount} promise${d.keptCount === 1 ? "" : "s"} kept` : ""}
              </li>
            ))}
        </ul>
      </details>
    </section>
  );
}
