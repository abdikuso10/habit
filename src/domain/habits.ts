import { SEED_ALL_DAY_HABITS, SEED_HABIT_CUES } from "./cues";
import { dayOfWeek } from "./date";
import {
  DayRecord,
  Habit,
  HabitLevel,
  HabitMetric,
  HabitSchedule,
  PILLARS_META,
  PillarId,
} from "@/persistence/types";

export { PILLARS_META };
export type { PillarId };

function checkbox(): HabitMetric {
  return { type: "checkbox" };
}
function duration(targetMinutes: number): HabitMetric {
  return { type: "duration", targetMinutes };
}
function daily(): HabitSchedule {
  return { type: "daily" };
}

/** Seed list used only when a new account is created. After that, each
 * account's habits live in TrackerState.habitsByPillar and can be edited. */
export function defaultHabitsByPillar(
  dayOneDate: string,
  focusTargetMinutes: number
): Record<PillarId, Habit[]> {
  const base = (
    id: string,
    label: string,
    level: HabitLevel,
    metric: HabitMetric = checkbox(),
    jp?: string
  ): Habit => ({
    id,
    label,
    jp,
    metric,
    schedule: daily(),
    level,
    activeFrom: dayOneDate,
    // A seeded habit ships with its cue already set, so a brand-new account
    // starts with real cues rather than a flat list the user has to anchor
    // themselves before the day view means anything. The abstentions are
    // marked all-day explicitly so the app never asks them for a cue.
    ...(SEED_HABIT_CUES[id]
      ? { cue: { ...SEED_HABIT_CUES[id] } }
      : SEED_ALL_DAY_HABITS.includes(id)
        ? { cue: { allDay: true } }
        : {}),
  });

  return {
    spiritual: [
      base("fajr", "Fajr on time", "minimum"),
      base("dhuhr", "Dhuhr", "minimum"),
      base("asr", "Asr", "minimum"),
      base("maghrib", "Maghrib", "minimum"),
      base("isha", "Isha", "minimum"),
      base("quran", "Qur'an 10 minutes", "target"),
      base("istighfar", "Istighfar x100", "target"),
    ],
    body: [
      base("gym", "Gym session", "target"),
      base("noKhat", "No khat today", "minimum", checkbox(), "カートなし"),
      base("noShisha", "No shisha today", "minimum", checkbox(), "禁煙"),
      base("noAlcohol", "No alcohol today", "minimum", checkbox(), "禁酒"),
      base("bedBy11", "In bed by 11 pm", "target"),
      base("water", "2 litres of water", "minimum"),
    ],
    mind: [
      base("focus25", "25 min deep focus, phone away", "target"),
      base("deepWork", "Focus session", "stretch", duration(focusTargetMinutes)),
      base("reading", "Read a book, 10 pages", "target"),
      base("noImpulseSpending", "No impulse spending", "minimum"),
      base("journal", "Two lines in the journal", "target"),
      // Meditation stays a checkbox habit, marked done when a timed session
      // completes (see MeditationTimer, driven by settings.meditationDefaultMinutes).
      // It never becomes a duration-metric habit so its historical meaning
      // never depends on a duration figure pre-v5 data can't reconstruct.
      base("meditation", "Meditation", "target"),
    ],
  };
}

export function flattenHabits(habitsByPillar: Record<PillarId, Habit[]>): Habit[] {
  return PILLARS_META.flatMap((p) => habitsByPillar[p.id] ?? []);
}

export function generateHabitId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Whether a habit is even in play on a given day — archived, not-yet-active,
 * and paused habits are excluded from that day's completion denominator. */
export function isHabitScheduledOnDay(habit: Habit, dateKey: string): boolean {
  if (habit.archivedAt && dateKey >= habit.archivedAt) return false;
  if (dateKey < habit.activeFrom) return false;
  if (habit.pausedUntil && dateKey <= habit.pausedUntil) return false;

  switch (habit.schedule.type) {
    case "daily":
      return true;
    case "weekdays": {
      const dow = dayOfWeek(dateKey);
      return dow >= 1 && dow <= 5;
    }
    case "daysOfWeek":
      return habit.schedule.days.includes(dayOfWeek(dateKey));
    case "timesPerWeek":
      // Flexible across the week rather than tied to one day — it doesn't
      // inflate/deflate any single day's denominator. Weekly consistency is
      // evaluated separately (see completion.ts weeklyTimesPerWeekProgress).
      return false;
    default:
      return false;
  }
}

export function habitTargetValue(metric: HabitMetric): number {
  switch (metric.type) {
    case "checkbox":
      return 1;
    case "count":
    case "amount":
      return metric.target;
    case "duration":
      return metric.targetMinutes;
  }
}

export function habitValueOnDay(habit: Habit, day: DayRecord | undefined): number {
  if (!day) return 0;
  if (habit.metric.type === "checkbox") return day.habits[habit.id] ? 1 : 0;
  if (habit.id === "deepWork" && habit.metric.type === "duration") {
    return Math.floor((day.focusSeconds ?? 0) / 60);
  }
  if (habit.id === "meditation" && habit.metric.type === "duration") {
    return Math.floor((day.meditationSeconds ?? 0) / 60);
  }
  return day.habitValues?.[habit.id] ?? 0;
}

export function isHabitCompletedOnDay(habit: Habit, day: DayRecord | undefined): boolean {
  return habitValueOnDay(habit, day) >= habitTargetValue(habit.metric);
}

export function habitProgressOnDay(
  habit: Habit,
  day: DayRecord | undefined
): { value: number; target: number; pct: number } {
  const value = habitValueOnDay(habit, day);
  const target = habitTargetValue(habit.metric);
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return { value, target, pct };
}

export function metricUnitLabel(metric: HabitMetric): string {
  switch (metric.type) {
    case "checkbox":
      return "";
    case "count":
      return metric.unit;
    case "amount":
      return metric.unit;
    case "duration":
      return "min";
  }
}

export function scheduleLabel(schedule: HabitSchedule): string {
  switch (schedule.type) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "daysOfWeek": {
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return schedule.days
        .slice()
        .sort()
        .map((d) => names[d])
        .join(", ");
    }
    case "timesPerWeek":
      return `${schedule.target}x per week`;
  }
}

export function isHabitArchived(habit: Habit): boolean {
  return Boolean(habit.archivedAt);
}

export function isHabitPaused(habit: Habit, dateKey: string): boolean {
  return Boolean(habit.pausedUntil && dateKey <= habit.pausedUntil);
}
