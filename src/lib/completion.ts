import { addDays, daysBetween } from "./date";
import { flattenHabits } from "./habits";
import { DayRecord, TrackerState } from "./types";

export const STREAK_THRESHOLD = 70;

export function completionPct(
  day: DayRecord | undefined,
  habitIds: string[]
): number {
  if (!day || habitIds.length === 0) return 0;
  let done = 0;
  for (const id of habitIds) {
    if (day.habits[id]) done += 1;
  }
  return Math.round((done / habitIds.length) * 100);
}

export function calcStreak(state: TrackerState, todayKey: string): number {
  const habitIds = flattenHabits(state.habitsByPillar).map((h) => h.id);
  const todayPct = completionPct(state.days[todayKey], habitIds);
  let cursor = todayPct >= STREAK_THRESHOLD ? todayKey : addDays(todayKey, -1);
  let streak = 0;

  while (daysBetween(state.dayOneDate, cursor) >= 0) {
    const pct = completionPct(state.days[cursor], habitIds);
    if (pct >= STREAK_THRESHOLD) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}
