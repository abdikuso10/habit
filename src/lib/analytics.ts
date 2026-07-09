import { completionPct, STREAK_THRESHOLD } from "./completion";
import { addDays, daysBetween } from "./date";
import { flattenHabits, PILLARS_META } from "./habits";
import { TrackerState } from "./types";

export interface PillarBreakdown {
  id: string;
  title: string;
  avgPct: number;
}

export interface DayHistoryPoint {
  dateKey: string;
  pct: number;
}

export interface Analytics {
  daysTracked: number;
  bestStreak: number;
  avgCompletion: number;
  pillarBreakdown: PillarBreakdown[];
  last14Days: DayHistoryPoint[];
}

export function computeAnalytics(
  state: TrackerState,
  todayKey: string
): Analytics {
  const habitIds = flattenHabits(state.habitsByPillar).map((h) => h.id);

  const trackedKeys = Object.keys(state.days).filter(
    (key) => daysBetween(state.dayOneDate, key) >= 0 && daysBetween(key, todayKey) >= 0
  );
  const daysTracked = trackedKeys.length;

  let bestStreak = 0;
  let running = 0;
  let cursor = state.dayOneDate;
  while (daysBetween(cursor, todayKey) >= 0) {
    const pct = completionPct(state.days[cursor], habitIds);
    if (pct >= STREAK_THRESHOLD) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
    cursor = addDays(cursor, 1);
  }

  const avgCompletion = daysTracked
    ? Math.round(
        trackedKeys.reduce(
          (sum, key) => sum + completionPct(state.days[key], habitIds),
          0
        ) / daysTracked
      )
    : 0;

  const pillarBreakdown: PillarBreakdown[] = PILLARS_META.map((pillar) => {
    const pillarHabits = state.habitsByPillar[pillar.id] ?? [];
    if (daysTracked === 0 || pillarHabits.length === 0) {
      return { id: pillar.id, title: pillar.title, avgPct: 0 };
    }
    const total = trackedKeys.reduce((sum, key) => {
      const day = state.days[key];
      if (!day) return sum;
      const done = pillarHabits.filter((h) => day.habits[h.id]).length;
      return sum + (done / pillarHabits.length) * 100;
    }, 0);
    return {
      id: pillar.id,
      title: pillar.title,
      avgPct: Math.round(total / daysTracked),
    };
  });

  const last14Days: DayHistoryPoint[] = Array.from({ length: 14 }, (_, i) => {
    const dateKey = addDays(todayKey, i - 13);
    if (daysBetween(state.dayOneDate, dateKey) < 0) return { dateKey, pct: 0 };
    return { dateKey, pct: completionPct(state.days[dateKey], habitIds) };
  });

  return { daysTracked, bestStreak, avgCompletion, pillarBreakdown, last14Days };
}
