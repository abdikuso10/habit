// All analytics are derived on demand from the ledger/journal/habit history —
// nothing here is ever persisted. Pure functions, safe on empty data, never
// divide by zero, and deliberately do not produce one "overall score."

import { addDays, dayOfWeek, daysBetween, getJourneyWindow, JOURNEY_END_DATE, monthKey, startOfWeek } from "./date";
import { calcStreak, bestStreak as computeBestStreak, completionPct, computeDayLevels, pillarCompletionPct } from "./completion";
import { commitmentsKeptInWeekOf, commitmentsKeptOn, promisePoints } from "./commitments";
import { debtProgressPct, savingsProgressPct } from "./finance";
import { flattenHabits, isHabitScheduledOnDay, isHabitCompletedOnDay } from "./habits";
import { Habit, PILLARS_META, TrackerState } from "@/persistence/types";

export interface PillarBreakdown {
  id: string;
  title: string;
  avgPct: number;
}

export interface DayHistoryPoint {
  dateKey: string;
  pct: number;
}

export interface HabitConsistency {
  habitId: string;
  label: string;
  pillarId: string;
  scheduledDays: number;
  completedDays: number;
  pct: number;
  archived: boolean;
}

export interface WeekdayMissRate {
  dayOfWeek: number; // 0=Sun..6=Sat
  label: string;
  scheduled: number;
  missed: number;
  missRate: number;
}

export interface WeeklyTrendPoint {
  weekStart: string;
  avgPct: number;
  focusMinutes: number;
}

export interface Analytics {
  daysTracked: number;
  scheduledCompletionPct: number;
  minimumConsistencyPct: number;
  targetConsistencyPct: number;
  bestStreak: number;
  currentStreak: number;
  promisePoints: number;
  promisesKeptToday: number;
  promisesKeptThisWeek: number;
  pendingPromises: number;
  pillarBreakdown: PillarBreakdown[];
  last14Days: DayHistoryPoint[];
  perHabitConsistency: HabitConsistency[];
  weeklyTrend: WeeklyTrendPoint[];
  monthlyTrend: { month: string; avgPct: number }[];
  mostMissedWeekdays: WeekdayMissRate[];
  savingsProgressPct: number;
  debtProgressPct: number;
  focusMinutesThisWeek: number;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeAnalytics(state: TrackerState, todayKey: string): Analytics {
  const effectiveToday = getJourneyWindow(state.dayOneDate, todayKey).effectiveToday;
  const habits = flattenHabits(state.habitsByPillar);
  const trackedKeys = Object.keys(state.days).filter(
    (key) => daysBetween(state.dayOneDate, key) >= 0 && daysBetween(key, effectiveToday) >= 0 && daysBetween(key, JOURNEY_END_DATE) >= 0
  );
  const daysTracked = trackedKeys.length;

  const avgOf = (fn: (key: string) => number) =>
    trackedKeys.length === 0
      ? 0
      : Math.round(trackedKeys.reduce((sum, key) => sum + fn(key), 0) / trackedKeys.length);

  const scheduledCompletionPct = avgOf((key) => completionPct(habits, state.days[key], key));
  const minimumConsistencyPct = avgOf((key) => computeDayLevels(habits, state.days[key], key).minimum.pct);
  const targetConsistencyPct = avgOf((key) => computeDayLevels(habits, state.days[key], key).target.pct);

  const pillarBreakdown: PillarBreakdown[] = PILLARS_META.map((pillar) => ({
    id: pillar.id,
    title: pillar.title,
    avgPct: avgOf((key) => pillarCompletionPct(state.habitsByPillar, pillar.id, state.days[key], key)),
  }));

  const last14Days: DayHistoryPoint[] = Array.from({ length: 14 }, (_, i) => {
    const dateKey = addDays(effectiveToday, i - 13);
    if (daysBetween(state.dayOneDate, dateKey) < 0) return { dateKey, pct: 0 };
    return { dateKey, pct: completionPct(habits, state.days[dateKey], dateKey) };
  });

  const perHabitConsistency: HabitConsistency[] = habits.map((habit) => {
    let scheduled = 0;
    let completed = 0;
    for (const key of trackedKeys) {
      if (!isHabitScheduledOnDay(habit, key)) continue;
      scheduled += 1;
      if (isHabitCompletedOnDay(habit, state.days[key])) completed += 1;
    }
    const pillarId = PILLARS_META.find((p) => (state.habitsByPillar[p.id] ?? []).includes(habit))?.id ?? "mind";
    return {
      habitId: habit.id,
      label: habit.label,
      pillarId,
      scheduledDays: scheduled,
      completedDays: completed,
      pct: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
      archived: Boolean(habit.archivedAt),
    };
  });

  const weeklyTrend = computeAllWeeklyTrend(state, habits, trackedKeys, effectiveToday).slice(-8);
  const monthlyTrend = computeMonthlyTrend(trackedKeys, (key) => completionPct(habits, state.days[key], key));
  const mostMissedWeekdays = computeWeekdayMissRates(habits, trackedKeys, state);

  const thisWeekStart = startOfWeek(effectiveToday);
  const focusMinutesThisWeek = Array.from({ length: 7 }, (_, i) => addDays(thisWeekStart, i))
    .filter((key) => daysBetween(key, effectiveToday) >= 0 && daysBetween(key, JOURNEY_END_DATE) >= 0)
    .reduce((sum, key) => sum + Math.floor((state.days[key]?.focusSeconds ?? 0) / 60), 0);

  return {
    daysTracked,
    scheduledCompletionPct,
    minimumConsistencyPct,
    targetConsistencyPct,
    bestStreak: computeBestStreak(state, effectiveToday),
    currentStreak: calcStreak(state, effectiveToday),
    promisePoints: promisePoints(state.commitments),
    promisesKeptToday: commitmentsKeptOn(state.commitments, todayKey).length,
    promisesKeptThisWeek: commitmentsKeptInWeekOf(state.commitments, todayKey).length,
    pendingPromises: state.commitments.filter((c) => c.status === "pending").length,
    pillarBreakdown,
    last14Days,
    perHabitConsistency,
    weeklyTrend,
    monthlyTrend,
    mostMissedWeekdays,
    savingsProgressPct: savingsProgressPct(state.money.transactions, state.settings.money.savingsGoal),
    debtProgressPct: debtProgressPct(state.money.transactions, state.settings.money),
    focusMinutesThisWeek,
  };
}

/** Every tracked week's average completion + focus minutes, oldest first. */
export function computeAllWeeklyTrend(
  state: TrackerState,
  habits: Habit[],
  trackedKeys: string[],
  todayKey: string
): WeeklyTrendPoint[] {
  const weekStarts = new Set<string>();
  for (const key of trackedKeys) weekStarts.add(startOfWeek(key));
  const sorted = Array.from(weekStarts).sort();

  return sorted.map((weekStart) => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(
      (key) => daysBetween(state.dayOneDate, key) >= 0 && daysBetween(key, todayKey) >= 0
    );
    const avgPct =
      weekDays.length === 0
        ? 0
        : Math.round(
            weekDays.reduce((sum, key) => sum + completionPct(habits, state.days[key], key), 0) /
              weekDays.length
          );
    const focusMinutes = weekDays.reduce(
      (sum, key) => sum + Math.floor((state.days[key]?.focusSeconds ?? 0) / 60),
      0
    );
    return { weekStart, avgPct, focusMinutes };
  });
}

function computeMonthlyTrend(
  trackedKeys: string[],
  pctFor: (key: string) => number
): { month: string; avgPct: number }[] {
  const byMonth = new Map<string, number[]>();
  for (const key of trackedKeys) {
    const m = monthKey(key);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(pctFor(key));
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pcts]) => ({
      month,
      avgPct: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
    }));
}

function computeWeekdayMissRates(
  habits: Habit[],
  trackedKeys: string[],
  state: TrackerState
): WeekdayMissRate[] {
  const buckets = Array.from({ length: 7 }, (_, dow) => ({
    dayOfWeek: dow,
    label: WEEKDAY_LABELS[dow],
    scheduled: 0,
    missed: 0,
  }));

  for (const key of trackedKeys) {
    const dow = dayOfWeek(key);
    const day = state.days[key];
    for (const habit of habits) {
      if (!isHabitScheduledOnDay(habit, key)) continue;
      buckets[dow].scheduled += 1;
      if (!isHabitCompletedOnDay(habit, day)) buckets[dow].missed += 1;
    }
  }

  return buckets
    .map((b) => ({ ...b, missRate: b.scheduled === 0 ? 0 : Math.round((b.missed / b.scheduled) * 100) }))
    .sort((a, b) => b.missRate - a.missRate);
}

export function bestWeeks(weeklyTrend: WeeklyTrendPoint[], topN: number): WeeklyTrendPoint[] {
  return weeklyTrend.slice().sort((a, b) => b.avgPct - a.avgPct).slice(0, topN);
}

export interface OverscheduledHabit {
  habitId: string;
  label: string;
  scheduledDays: number;
  pct: number;
}

/** Habits that are scheduled often but rarely completed — a signal the
 * schedule may be more ambitious than fits right now, framed supportively
 * rather than as a failure. */
export function possiblyOverscheduledHabits(perHabitConsistency: HabitConsistency[]): OverscheduledHabit[] {
  return perHabitConsistency
    .filter((h) => !h.archived && h.scheduledDays >= 5 && h.pct < 40)
    .map((h) => ({ habitId: h.habitId, label: h.label, scheduledDays: h.scheduledDays, pct: h.pct }))
    .sort((a, b) => a.pct - b.pct);
}
