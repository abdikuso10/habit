// Supportive daily scoring. A day is evaluated in tiers (minimum / target /
// stretch) rather than a single pass/fail number, and special days (rest,
// sick, travel, recovery) are excused rather than scored as missed.

import { addDays, daysBetween, daysInSameWeek } from "./date";
import { flattenHabits, isHabitScheduledOnDay, isHabitCompletedOnDay } from "./habits";
import { DayRecord, Habit, HabitLevel, PillarId, STREAK_THRESHOLD, SpecialDayState, TrackerState } from "@/persistence/types";

export { STREAK_THRESHOLD };

function scheduledHabitsOnDay(habits: Habit[], dateKey: string): Habit[] {
  return habits.filter((h) => isHabitScheduledOnDay(h, dateKey));
}

/** Percent complete among habits actually scheduled that day. 0 scheduled
 * habits reads as 100% (nothing was asked of the day, nothing was missed). */
export function completionPct(habits: Habit[], day: DayRecord | undefined, dateKey: string): number {
  const scheduled = scheduledHabitsOnDay(habits, dateKey);
  if (scheduled.length === 0) return 100;
  const done = scheduled.filter((h) => isHabitCompletedOnDay(h, day)).length;
  return Math.round((done / scheduled.length) * 100);
}

export function isSpecialDay(state: SpecialDayState | undefined): boolean {
  return Boolean(state) && state !== "normal";
}

export interface DayLevelBreakdown {
  minimum: { scheduled: number; completed: number; pct: number; met: boolean };
  target: { scheduled: number; completed: number; pct: number; met: boolean };
  stretch: { scheduled: number; completed: number; pct: number; met: boolean };
  /** Highest tier fully satisfied, or null if even the minimum tier isn't met. */
  achievedTier: HabitLevel | null;
}

/** Each tier is cumulative: "target" progress includes minimum-level habits too. */
const LEVELS_INCLUDED: Record<HabitLevel, HabitLevel[]> = {
  minimum: ["minimum"],
  target: ["minimum", "target"],
  stretch: ["minimum", "target", "stretch"],
};

export function computeDayLevels(habits: Habit[], day: DayRecord | undefined, dateKey: string): DayLevelBreakdown {
  const scheduled = scheduledHabitsOnDay(habits, dateKey);

  const tier = (level: HabitLevel) => {
    const included = LEVELS_INCLUDED[level];
    const habitsInTier = scheduled.filter((h) => included.includes(h.level));
    const completed = habitsInTier.filter((h) => isHabitCompletedOnDay(h, day)).length;
    const pct = habitsInTier.length === 0 ? 100 : Math.round((completed / habitsInTier.length) * 100);
    return { scheduled: habitsInTier.length, completed, pct, met: pct >= 100 };
  };

  const minimum = tier("minimum");
  const target = tier("target");
  const stretch = tier("stretch");

  let achievedTier: HabitLevel | null = null;
  if (minimum.met) achievedTier = "minimum";
  if (target.met) achievedTier = "target";
  if (stretch.met) achievedTier = "stretch";

  return { minimum, target, stretch, achievedTier };
}

/** Current streak of qualifying days, counting back from today (or yesterday
 * if today hasn't reached the threshold yet). Special days neither extend nor
 * break the streak — they're skipped over, matching "streaks are optional
 * motivation, not the main judgment." */
export function calcStreak(state: TrackerState, todayKeyValue: string): number {
  const habits = flattenHabits(state.habitsByPillar);
  const todayPct = completionPct(habits, state.days[todayKeyValue], todayKeyValue);
  let cursor = todayPct >= STREAK_THRESHOLD ? todayKeyValue : addDays(todayKeyValue, -1);
  let streak = 0;

  while (daysBetween(state.dayOneDate, cursor) >= 0) {
    const day = state.days[cursor];
    if (isSpecialDay(day?.specialState)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const pct = completionPct(habits, day, cursor);
    if (pct >= STREAK_THRESHOLD) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function bestStreak(state: TrackerState, todayKeyValue: string): number {
  const habits = flattenHabits(state.habitsByPillar);
  let best = 0;
  let running = 0;
  let cursor = state.dayOneDate;
  while (daysBetween(cursor, todayKeyValue) >= 0) {
    const day = state.days[cursor];
    if (isSpecialDay(day?.specialState)) {
      cursor = addDays(cursor, 1);
      continue;
    }
    const pct = completionPct(habits, day, cursor);
    if (pct >= STREAK_THRESHOLD) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

/** Progress toward a "timesPerWeek" habit's weekly target, for the week
 * containing dateKey. Not part of any single day's denominator. */
export function weeklyTimesPerWeekProgress(
  habit: Habit,
  days: Record<string, DayRecord>,
  dateKey: string
): { completed: number; target: number } {
  if (habit.schedule.type !== "timesPerWeek") return { completed: 0, target: 0 };
  const week = daysInSameWeek(dateKey);
  const completed = week.filter((d) => isHabitCompletedOnDay(habit, days[d])).length;
  return { completed, target: habit.schedule.target };
}

export function pillarCompletionPct(
  habitsByPillar: Record<PillarId, Habit[]>,
  pillarId: PillarId,
  day: DayRecord | undefined,
  dateKey: string
): number {
  return completionPct(habitsByPillar[pillarId] ?? [], day, dateKey);
}
