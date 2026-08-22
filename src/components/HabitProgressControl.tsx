"use client";

import { Minus, Plus } from "lucide-react";
import { habitProgressOnDay, metricUnitLabel } from "@/domain/habits";
import { DayRecord, Habit } from "@/persistence/types";
import { HabitCheckbox } from "./HabitCheckbox";

export function HabitProgressControl({
  habit,
  day,
  onToggleCheckbox,
  onSetValue,
}: {
  habit: Habit;
  day: DayRecord | undefined;
  onToggleCheckbox: () => void;
  onSetValue: (value: number) => void;
}) {
  if (habit.metric.type === "checkbox") {
    return (
      <HabitCheckbox
        id={habit.id}
        label={habit.label}
        jp={habit.jp}
        checked={Boolean(day?.habits[habit.id])}
        onChange={onToggleCheckbox}
      />
    );
  }

  const { value, target, pct } = habitProgressOnDay(habit, day);
  const unit = metricUnitLabel(habit.metric);
  const step = habit.metric.type === "duration" ? 5 : 1;
  const done = value >= target;

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm ${done ? "text-slate" : "text-parchment"}`}>{habit.label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetValue(Math.max(0, value - step))}
            aria-label={`Decrease ${habit.label}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Minus size={13} aria-hidden="true" />
          </button>
          <span className="font-numeric min-w-14 text-center text-sm tabular-nums text-parchment" aria-live="polite">
            {value}
            <span className="text-slate">
              /{target}
              {unit ? ` ${unit}` : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onSetValue(value + step)}
            aria-label={`Increase ${habit.label}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-night" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${habit.label} progress`}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: done ? "var(--color-gold)" : "var(--color-green)" }}
        />
      </div>
    </div>
  );
}
