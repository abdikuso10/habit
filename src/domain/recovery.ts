// "Never miss twice" — the recovery logic.
//
// A plain streak counter is a loss-aversion device: it works right up until
// it breaks, and then it actively hurts. Once the number resets to zero the
// day's miss gets reinterpreted as a failed attempt, and the most common
// next move is to stop opening the app at all.
//
// The evidence says that reading is simply wrong. Lally et al. (2010) found
// that missing a single opportunity did not materially affect the
// habit-formation trajectory. One miss is noise. Two misses in a row is the
// point where the cue-behaviour pairing starts to come apart, and that is
// the only moment worth raising the user's attention.
//
// So this module answers one question per habit: how many *consecutive*
// scheduled opportunities have been missed, ending at the last opportunity
// that is actually over? Today is deliberately excluded — the day is still
// live, and calling something missed before it has finished is both untrue
// and discouraging.

import { addDays, daysBetween } from "./date";
import { completionPct, isSpecialDay, STREAK_THRESHOLD } from "./completion";
import { flattenHabits, isHabitCompletedOnDay, isHabitScheduledOnDay } from "./habits";
import { DayRecord, Habit, TrackerState } from "@/persistence/types";

/** Consecutive misses at which the pairing is treated as coming apart. */
export const MISS_TWICE_THRESHOLD = 2;
/** Consecutive misses after which we stop nudging and suggest a smaller ask. */
export const LAPSED_THRESHOLD = 3;

export type HabitRiskStatus =
  | "no-history" // never had a completed opportunity yet
  | "on-track" // last scheduled opportunity was kept
  | "missed-once" // exactly one miss — the "don't miss twice" moment
  | "missed-twice" // the pairing is slipping
  | "lapsed"; // three or more — the ask itself is probably wrong

export interface HabitRisk {
  habitId: string;
  label: string;
  status: HabitRiskStatus;
  consecutiveMisses: number;
  lastCompletedDate: string | null;
  /** True for exactly the case the whole module exists to catch. */
  isNeverMissTwiceMoment: boolean;
  /** Whether this habit is scheduled today, i.e. whether the user can act now. */
  scheduledToday: boolean;
}

/**
 * Walks backwards from yesterday over scheduled, non-excused days.
 *
 * Special days are skipped rather than counted: a rest or sick day was
 * excused by the user on purpose, and turning it into a miss would punish
 * exactly the honesty the feature is meant to encourage.
 */
export function computeHabitRisk(
  habit: Habit,
  days: Record<string, DayRecord>,
  dayOneDate: string,
  todayKey: string
): HabitRisk {
  const base = {
    habitId: habit.id,
    label: habit.label,
    scheduledToday: isHabitScheduledOnDay(habit, todayKey),
  };

  // Never look further back than the first day actually recorded. Days before
  // the user started using the app were not missed — nothing was asked of
  // them yet — and counting them turns a backdated start date into a report
  // of hundreds of consecutive failures on a brand-new account.
  const earliestRecorded = earliestRecordedDay(days, dayOneDate);
  if (earliestRecorded === null) {
    return {
      ...base,
      status: "no-history",
      consecutiveMisses: 0,
      lastCompletedDate: null,
      isNeverMissTwiceMoment: false,
    };
  }

  // "timesPerWeek" habits are never bound to a specific day, so consecutive
  // daily misses are not a meaningful notion for them.
  if (habit.schedule.type === "timesPerWeek") {
    return {
      ...base,
      status: "on-track",
      consecutiveMisses: 0,
      lastCompletedDate: lastCompletedOnOrBefore(habit, days, dayOneDate, todayKey),
      isNeverMissTwiceMoment: false,
    };
  }

  const activeFloor = habit.activeFrom > dayOneDate ? habit.activeFrom : dayOneDate;
  const floor = activeFloor > earliestRecorded ? activeFloor : earliestRecorded;
  let cursor = addDays(todayKey, -1);
  let consecutiveMisses = 0;
  let sawOpportunity = false;
  let lastCompletedDate: string | null = null;

  while (daysBetween(floor, cursor) >= 0) {
    const day = days[cursor];
    if (isSpecialDay(day?.specialState) || !isHabitScheduledOnDay(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    sawOpportunity = true;
    if (isHabitCompletedOnDay(habit, day)) {
      lastCompletedDate = cursor;
      break;
    }
    consecutiveMisses += 1;
    cursor = addDays(cursor, -1);
  }

  let status: HabitRiskStatus;
  if (!sawOpportunity) status = "no-history";
  else if (consecutiveMisses === 0) status = "on-track";
  else if (consecutiveMisses === 1) status = "missed-once";
  else if (consecutiveMisses < LAPSED_THRESHOLD) status = "missed-twice";
  else status = "lapsed";

  return {
    ...base,
    status,
    consecutiveMisses,
    lastCompletedDate,
    isNeverMissTwiceMoment: status === "missed-once" && base.scheduledToday,
  };
}

/** The first day on or after day one that has a record at all, or null when
 * the app has never been used. */
function earliestRecordedDay(days: Record<string, DayRecord>, dayOneDate: string): string | null {
  let earliest: string | null = null;
  for (const key of Object.keys(days)) {
    if (key < dayOneDate) continue;
    if (earliest === null || key < earliest) earliest = key;
  }
  return earliest;
}

function lastCompletedOnOrBefore(
  habit: Habit,
  days: Record<string, DayRecord>,
  floorKey: string,
  toKey: string
): string | null {
  let cursor = toKey;
  while (daysBetween(floorKey, cursor) >= 0) {
    if (isHabitCompletedOnDay(habit, days[cursor])) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

export function computeAllHabitRisks(state: TrackerState, todayKey: string): HabitRisk[] {
  return flattenHabits(state.habitsByPillar)
    .filter((habit) => !habit.archivedAt)
    .map((habit) => computeHabitRisk(habit, state.days, state.dayOneDate, todayKey));
}

/** Habits where acting today prevents a second consecutive miss. This is the
 * highest-value list in the app: it is the shortest path from "slipping" back
 * to "on track". */
export function neverMissTwiceHabits(risks: HabitRisk[]): HabitRisk[] {
  return risks.filter((r) => r.isNeverMissTwiceMoment);
}

export type DayRecoveryStatus = "fresh-start" | "steady" | "recovering" | "rebuilding";

export interface DayRecovery {
  status: DayRecoveryStatus;
  /** Completion of the most recent finished, non-excused day, or null if none. */
  previousDayPct: number | null;
  previousDayKey: string | null;
  consecutiveBelowThresholdDays: number;
  headline: string;
  /** Never blame; always describe the next concrete move. */
  body: string;
}

/**
 * The day-level counterpart to per-habit risk. Framed as trajectory, never as
 * a verdict: "yesterday was light, today puts you back on" rather than
 * "you broke your streak."
 */
export function computeDayRecovery(state: TrackerState, todayKey: string): DayRecovery {
  const habits = flattenHabits(state.habitsByPillar);

  // Only walk back as far as the first day actually recorded. Days before the
  // user started using the app were never missed — there was nothing to miss.
  // Without this, backdating your day-one date greets a brand-new account
  // with "232 quiet days", which is both untrue and exactly the kind of
  // discouragement this whole module exists to avoid.
  const recorded = Object.keys(state.days).filter((key) => daysBetween(state.dayOneDate, key) >= 0);
  if (recorded.length === 0) {
    return {
      status: "fresh-start",
      previousDayPct: null,
      previousDayKey: null,
      consecutiveBelowThresholdDays: 0,
      headline: "Day one",
      body: "Nothing to catch up on. Pick the smallest thing on the list and start there.",
    };
  }
  const floor = recorded.reduce((min, key) => (key < min ? key : min), recorded[0]);

  let cursor = addDays(todayKey, -1);
  let consecutive = 0;
  let previousDayPct: number | null = null;
  let previousDayKey: string | null = null;

  while (daysBetween(floor, cursor) >= 0) {
    const day = state.days[cursor];
    if (isSpecialDay(day?.specialState)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const pct = completionPct(habits, day, cursor);
    if (previousDayPct === null) {
      previousDayPct = pct;
      previousDayKey = cursor;
    }
    if (pct >= STREAK_THRESHOLD) break;
    consecutive += 1;
    cursor = addDays(cursor, -1);
  }

  if (previousDayPct === null) {
    return {
      status: "fresh-start",
      previousDayPct: null,
      previousDayKey: null,
      consecutiveBelowThresholdDays: 0,
      headline: "Day one",
      body: "Nothing to catch up on. Pick the smallest thing on the list and start there.",
    };
  }

  if (consecutive === 0) {
    return {
      status: "steady",
      previousDayPct,
      previousDayKey,
      consecutiveBelowThresholdDays: 0,
      headline: "On track",
      body: "Yesterday held. Keep the cues where they are — consistency is what builds the habit, not intensity.",
    };
  }

  if (consecutive === 1) {
    return {
      status: "recovering",
      previousDayPct,
      previousDayKey,
      consecutiveBelowThresholdDays: 1,
      headline: "Never miss twice",
      body: "Yesterday was light. One missed day does not undo the habit — two in a row is what starts to. Today is the one that matters.",
    };
  }

  return {
    status: "rebuilding",
    previousDayPct,
    previousDayKey,
    consecutiveBelowThresholdDays: consecutive,
    headline: "Rebuilding",
    body: `${consecutive} quiet days. Don't try to win them back at once — do the minimum-level habits only today, and let that count as a full day.`,
  };
}
