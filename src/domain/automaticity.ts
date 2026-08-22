// Habit strength, modelled on the habit-formation curve rather than on streaks.
//
// Lally et al. (2010), "How are habits formed: Modelling habit formation in
// the real world" (European Journal of Social Psychology 40, 998-1009),
// fitted an asymptotic curve to daily automaticity self-reports across 12
// weeks. Three findings drive this module:
//
//   1. Automaticity rises along an asymptotic curve with repetition in a
//      consistent context — fast at first, then flattening.
//   2. The median time to reach 95% of that asymptote was 66 days, with a
//      very wide range (18-254 days). "66 days" is a median, not a rule.
//   3. Missing a single opportunity did not materially affect the curve.
//      This is why nothing here punishes one missed day.
//
// HONESTY NOTE, which matters as much as the maths: real automaticity is
// *measured* by self-report — the four-item SRBAI ("something I do without
// thinking"). This app never asks the user to rate anything, so what follows
// is NOT a measured automaticity score. It is a projection: given how many
// context-consistent repetitions you have actually logged, this is where
// Lally's median curve would put habit strength. Treat it as a coaching
// signal about trajectory, not as a psychometric result.

import { addDays, daysBetween } from "./date";
import { isSpecialDay } from "./completion";
import { isHabitCompletedOnDay, isHabitScheduledOnDay } from "./habits";
import { DayRecord, Habit } from "@/persistence/types";

/** Repetitions to reach 95% of asymptote, per Lally et al.'s median. */
export const REPETITIONS_TO_ASYMPTOTE = 66;

/** Growth constant k, solved so that 1 - e^(-k * 66) = 0.95. */
export const GROWTH_CONSTANT = Math.log(20) / REPETITIONS_TO_ASYMPTOTE;

export type HabitStrengthStage =
  | "not-started"
  | "starting"
  | "taking-hold"
  | "getting-automatic"
  | "near-automatic"
  | "automatic";

export interface HabitStrength {
  habitId: string;
  label: string;
  /** Scheduled opportunities since the habit became active (special days excluded). */
  opportunities: number;
  /** Opportunities actually completed. */
  repetitions: number;
  /** repetitions / opportunities, 0..1. Lally's "context consistency" proxy. */
  consistency: number;
  /**
   * Repetitions discounted by consistency. Thirty repetitions spread thinly
   * over ninety days build a weaker habit than thirty on thirty consecutive
   * days, because the cue-behaviour pairing is diluted; squaring completions
   * over opportunities expresses exactly that, and reduces to plain
   * repetition count when consistency is perfect.
   */
  effectiveRepetitions: number;
  /** 0-100, position along the modelled curve. */
  strengthPct: number;
  stage: HabitStrengthStage;
  /**
   * Calendar days to reach 95% at the consistency observed so far, or null
   * when the current rate would never get there (consistency of zero) or the
   * habit is already past the threshold.
   */
  projectedDaysToAutomatic: number | null;
}

export function strengthFromEffectiveRepetitions(effectiveRepetitions: number): number {
  if (effectiveRepetitions <= 0) return 0;
  const pct = (1 - Math.exp(-GROWTH_CONSTANT * effectiveRepetitions)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

export function stageFor(strengthPct: number, repetitions: number): HabitStrengthStage {
  if (repetitions === 0) return "not-started";
  if (strengthPct >= 95) return "automatic";
  if (strengthPct >= 85) return "near-automatic";
  if (strengthPct >= 60) return "getting-automatic";
  if (strengthPct >= 25) return "taking-hold";
  return "starting";
}

const STAGE_LABELS: Record<HabitStrengthStage, string> = {
  "not-started": "Not started",
  starting: "Starting out",
  "taking-hold": "Taking hold",
  "getting-automatic": "Getting automatic",
  "near-automatic": "Nearly automatic",
  automatic: "Automatic",
};

export function stageLabel(stage: HabitStrengthStage): string {
  return STAGE_LABELS[stage];
}

/**
 * Counts scheduled opportunities and completions for one habit across the
 * tracked window. Special days (rest/sick/travel/recovery) are skipped
 * entirely rather than counted as misses — they were excused, so they should
 * neither build strength nor erode it.
 */
export function computeHabitStrength(
  habit: Habit,
  days: Record<string, DayRecord>,
  fromDateKey: string,
  toDateKey: string
): HabitStrength {
  const start = habit.activeFrom > fromDateKey ? habit.activeFrom : fromDateKey;

  let opportunities = 0;
  let repetitions = 0;

  if (daysBetween(start, toDateKey) >= 0) {
    let cursor = start;
    while (daysBetween(cursor, toDateKey) >= 0) {
      const day = days[cursor];
      if (!isSpecialDay(day?.specialState) && isHabitScheduledOnDay(habit, cursor)) {
        opportunities += 1;
        if (isHabitCompletedOnDay(habit, day)) repetitions += 1;
      }
      cursor = addDays(cursor, 1);
    }
  }

  const consistency = opportunities === 0 ? 0 : repetitions / opportunities;
  const effectiveRepetitions = opportunities === 0 ? 0 : (repetitions * repetitions) / opportunities;
  const strengthPct = strengthFromEffectiveRepetitions(effectiveRepetitions);

  return {
    habitId: habit.id,
    label: habit.label,
    opportunities,
    repetitions,
    consistency,
    effectiveRepetitions,
    strengthPct,
    stage: stageFor(strengthPct, repetitions),
    projectedDaysToAutomatic: projectDaysToAutomatic(
      effectiveRepetitions,
      consistency,
      scheduledDensityPerDay(habit)
    ),
  };
}

/** Roughly how many times a week the schedule asks for this habit, expressed
 * per calendar day. Used only for projection, never for scoring. */
export function scheduledDensityPerDay(habit: Habit): number {
  switch (habit.schedule.type) {
    case "daily":
      return 1;
    case "weekdays":
      return 5 / 7;
    case "daysOfWeek":
      return habit.schedule.days.length / 7;
    case "timesPerWeek":
      return habit.schedule.target / 7;
    default:
      return 0;
  }
}

export function projectDaysToAutomatic(
  effectiveRepetitions: number,
  consistency: number,
  densityPerDay: number
): number | null {
  if (effectiveRepetitions >= REPETITIONS_TO_ASYMPTOTE) return null;
  if (consistency <= 0 || densityPerDay <= 0) return null;
  // Effective repetitions accumulate at (completions per day) x consistency.
  const effectiveRatePerDay = densityPerDay * consistency * consistency;
  if (effectiveRatePerDay <= 0) return null;
  const remaining = REPETITIONS_TO_ASYMPTOTE - effectiveRepetitions;
  return Math.ceil(remaining / effectiveRatePerDay);
}

export function computeAllHabitStrengths(
  habits: Habit[],
  days: Record<string, DayRecord>,
  fromDateKey: string,
  toDateKey: string
): HabitStrength[] {
  return habits
    .map((habit) => computeHabitStrength(habit, days, fromDateKey, toDateKey))
    .sort((a, b) => b.strengthPct - a.strengthPct);
}
