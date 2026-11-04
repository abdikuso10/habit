"use client";

import { Check, Lock, X } from "lucide-react";
import { useMemo } from "react";
import { groupHabitsByAnchor } from "@/domain/cues";
import { completionPct, isSpecialDay } from "@/domain/completion";
import { flattenHabits, habitProgressOnDay, isHabitCompletedOnDay, isHabitScheduledOnDay, metricUnitLabel } from "@/domain/habits";
import { todoPointsForDay, todosOf } from "@/domain/todos";
import { Habit } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { ANCHOR_HUE, UNANCHORED_HUE } from "./anchorStyles";

/*
  A finished day, as it was. Nothing on this screen writes to the tracker —
  there are no controls, only the record — so a past day can't be rewritten
  to look better after the fact.
*/
export function PastDayView({ dateKey }: { dateKey: string }) {
  const { state } = useTracker();

  const data = useMemo(() => {
    if (!state) return null;
    const habits = flattenHabits(state.habitsByPillar);
    const day = state.days[dateKey];
    const scheduled = habits.filter((h) => isHabitScheduledOnDay(h, dateKey));
    return {
      day,
      pct: completionPct(habits, day, dateKey),
      groups: groupHabitsByAnchor(scheduled),
      doneCount: scheduled.filter((h) => isHabitCompletedOnDay(h, day)).length,
      scheduledCount: scheduled.length,
    };
  }, [state, dateKey]);

  if (!data) return null;
  const { day, pct, groups, doneCount, scheduledCount } = data;
  const todos = todosOf(day);
  const special = isSpecialDay(day?.specialState) ? day?.specialState : null;

  return (
    <div className="space-y-4">
      <section aria-label="Day summary" className="rounded-2xl border border-hairline bg-panel p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-slate">
            <Lock size={12} aria-hidden="true" /> Read-only
          </p>
          <p className="font-numeric text-2xl text-parchment">{scheduledCount === 0 ? "—" : `${pct}%`}</p>
        </div>
        <p className="mt-1 text-sm text-slate">
          {scheduledCount === 0
            ? "Nothing was scheduled this day."
            : `${doneCount} of ${scheduledCount} habits completed.`}
          {special && ` Marked as ${special}.`}
        </p>
        {day?.intention && <p className="mt-3 text-sm text-parchment">Intention: {day.intention}</p>}
      </section>

      {groups.map((group) => {
        const hue = group.anchor ? ANCHOR_HUE[group.anchor] : UNANCHORED_HUE;
        return (
          <section
            key={group.anchor ?? "all-day"}
            aria-label={group.title}
            className="overflow-hidden rounded-2xl border border-hairline bg-panel px-5 py-4"
          >
            <h3 className="font-display text-lg" style={{ color: hue }}>
              {group.title}
            </h3>
            <ul className="mt-1 divide-y divide-white/5">
              {group.habits.map((habit) => (
                <PastHabitRow key={habit.id} habit={habit} day={day} />
              ))}
            </ul>
          </section>
        );
      })}

      {todos.length > 0 && (
        <section aria-label="List" className="rounded-2xl border border-hairline bg-panel p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg text-parchment">List</h3>
            <span className="font-numeric text-sm text-gold">+{todoPointsForDay(day)}</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {todos.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <StatusIcon done={t.done} />
                <span className={t.done ? "text-slate line-through" : "text-parchment"}>{t.text}</span>
                <span className="sr-only">{t.done ? "done" : "not done"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {day?.reflection && (
        <section aria-label="Reflection" className="rounded-2xl border border-hairline bg-panel p-5">
          <h3 className="font-display text-lg text-parchment">Reflection</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate">{day.reflection}</p>
        </section>
      )}
    </div>
  );
}

function StatusIcon({ done }: { done: boolean }) {
  return done ? (
    <Check size={14} strokeWidth={3} className="shrink-0 text-green" aria-hidden="true" />
  ) : (
    <X size={14} className="shrink-0 text-clay" aria-hidden="true" />
  );
}

function PastHabitRow({ habit, day }: { habit: Habit; day: Parameters<typeof habitProgressOnDay>[1] }) {
  const done = isHabitCompletedOnDay(habit, day);
  const showValue = habit.metric.type !== "checkbox";
  const { value, target } = habitProgressOnDay(habit, day);
  const unit = metricUnitLabel(habit.metric);

  return (
    <li className="flex items-center gap-2 py-2 text-sm">
      <StatusIcon done={done} />
      <span className={`min-w-0 flex-1 ${done ? "text-slate" : "text-parchment"}`}>{habit.label}</span>
      {showValue && (
        <span className="font-numeric text-xs tabular-nums text-slate">
          {value}/{target}
          {unit ? ` ${unit}` : ""}
        </span>
      )}
      <span className="sr-only">{done ? "done" : "not done"}</span>
    </li>
  );
}
