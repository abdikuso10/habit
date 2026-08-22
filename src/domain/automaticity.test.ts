import { describe, expect, it } from "vitest";
import {
  GROWTH_CONSTANT,
  REPETITIONS_TO_ASYMPTOTE,
  computeHabitStrength,
  projectDaysToAutomatic,
  scheduledDensityPerDay,
  stageFor,
  strengthFromEffectiveRepetitions,
} from "./automaticity";
import { addDays } from "./date";
import { DayRecord, Habit } from "@/persistence/types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    label: "Habit",
    metric: { type: "checkbox" },
    schedule: { type: "daily" },
    level: "target",
    activeFrom: "2026-01-01",
    ...overrides,
  };
}

/** Builds `total` consecutive days from 2026-01-01, the first `done` complete. */
function days(total: number, done: number, extra: Partial<DayRecord> = {}): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = {};
  for (let i = 0; i < total; i += 1) {
    const key = addDays("2026-01-01", i);
    out[key] = { habits: { h: i < done }, journal: "", ...extra };
  }
  return out;
}

describe("the curve itself", () => {
  it("is calibrated so 66 consistent repetitions reach 95% of asymptote", () => {
    // This is the whole point of GROWTH_CONSTANT — Lally et al.'s median.
    expect(strengthFromEffectiveRepetitions(REPETITIONS_TO_ASYMPTOTE)).toBe(95);
    expect(GROWTH_CONSTANT).toBeCloseTo(Math.log(20) / 66, 10);
  });

  it("starts at zero and rises monotonically, never past 100", () => {
    expect(strengthFromEffectiveRepetitions(0)).toBe(0);
    expect(strengthFromEffectiveRepetitions(-5)).toBe(0);
    let previous = 0;
    for (let n = 1; n <= 400; n += 7) {
      const value = strengthFromEffectiveRepetitions(n);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(100);
      previous = value;
    }
  });

  it("flattens: the first ten repetitions buy more than the tenth ten", () => {
    const first = strengthFromEffectiveRepetitions(10) - strengthFromEffectiveRepetitions(0);
    const later = strengthFromEffectiveRepetitions(100) - strengthFromEffectiveRepetitions(90);
    expect(first).toBeGreaterThan(later);
  });
});

describe("computeHabitStrength", () => {
  it("is zero, and not-started, with no history at all", () => {
    const strength = computeHabitStrength(habit(), {}, "2026-01-01", "2026-01-01");
    expect(strength.repetitions).toBe(0);
    expect(strength.strengthPct).toBe(0);
    expect(strength.stage).toBe("not-started");
  });

  it("counts scheduled opportunities and completions across the window", () => {
    const strength = computeHabitStrength(habit(), days(20, 15), "2026-01-01", "2026-01-20");
    expect(strength.opportunities).toBe(20);
    expect(strength.repetitions).toBe(15);
    expect(strength.consistency).toBeCloseTo(0.75, 5);
  });

  it("reduces to plain repetition count when consistency is perfect", () => {
    const strength = computeHabitStrength(habit(), days(30, 30), "2026-01-01", "2026-01-30");
    expect(strength.effectiveRepetitions).toBeCloseTo(30, 5);
  });

  it("discounts the same number of repetitions when they're spread thinner", () => {
    const dense = computeHabitStrength(habit(), days(20, 20), "2026-01-01", "2026-01-20");
    const sparse = computeHabitStrength(habit(), days(60, 20), "2026-01-01", "2026-03-01");
    expect(dense.repetitions).toBe(sparse.repetitions);
    // Same 20 repetitions, but diluted cue-behaviour pairing scores lower.
    expect(sparse.strengthPct).toBeLessThan(dense.strengthPct);
  });

  it("skips special days entirely rather than counting them as misses", () => {
    const base = days(10, 10);
    const withRest = { ...base, [addDays("2026-01-01", 5)]: { habits: {}, journal: "", specialState: "rest" as const } };
    const strength = computeHabitStrength(habit(), withRest, "2026-01-01", "2026-01-10");
    // The rest day is neither an opportunity nor a miss: 9 opportunities, all kept.
    expect(strength.opportunities).toBe(9);
    expect(strength.repetitions).toBe(9);
    expect(strength.consistency).toBe(1);
  });

  it("ignores days before the habit became active", () => {
    const strength = computeHabitStrength(
      habit({ activeFrom: "2026-01-11" }),
      days(20, 20),
      "2026-01-01",
      "2026-01-20"
    );
    expect(strength.opportunities).toBe(10);
  });

  it("only counts days the schedule actually asks for", () => {
    // Mondays only. 2026-01-01 is a Thursday; the window holds two Mondays.
    const strength = computeHabitStrength(
      habit({ schedule: { type: "daysOfWeek", days: [1] } }),
      days(14, 14),
      "2026-01-01",
      "2026-01-14"
    );
    expect(strength.opportunities).toBe(2);
  });

  it("never returns NaN when the window is empty or inverted", () => {
    const strength = computeHabitStrength(habit(), {}, "2026-02-01", "2026-01-01");
    expect(Number.isNaN(strength.strengthPct)).toBe(false);
    expect(strength.strengthPct).toBe(0);
    expect(strength.consistency).toBe(0);
  });
});

describe("stageFor", () => {
  it("reads as not-started until there is at least one repetition", () => {
    expect(stageFor(0, 0)).toBe("not-started");
    expect(stageFor(4, 1)).toBe("starting");
  });

  it("names the bands in order", () => {
    expect(stageFor(30, 10)).toBe("taking-hold");
    expect(stageFor(70, 30)).toBe("getting-automatic");
    expect(stageFor(88, 50)).toBe("near-automatic");
    expect(stageFor(96, 66)).toBe("automatic");
  });
});

describe("projectDaysToAutomatic", () => {
  it("is null once the threshold is already reached", () => {
    expect(projectDaysToAutomatic(REPETITIONS_TO_ASYMPTOTE, 1, 1)).toBeNull();
  });

  it("is null when the habit is never done — that rate never arrives", () => {
    expect(projectDaysToAutomatic(0, 0, 1)).toBeNull();
  });

  it("projects 66 days for a perfect daily start", () => {
    expect(projectDaysToAutomatic(0, 1, 1)).toBe(66);
  });

  it("projects further out when consistency is lower", () => {
    const perfect = projectDaysToAutomatic(0, 1, 1)!;
    const patchy = projectDaysToAutomatic(0, 0.5, 1)!;
    expect(patchy).toBeGreaterThan(perfect);
  });
});

describe("scheduledDensityPerDay", () => {
  it("reflects how often each schedule type asks", () => {
    expect(scheduledDensityPerDay(habit())).toBe(1);
    expect(scheduledDensityPerDay(habit({ schedule: { type: "weekdays" } }))).toBeCloseTo(5 / 7, 5);
    expect(scheduledDensityPerDay(habit({ schedule: { type: "daysOfWeek", days: [1, 3] } }))).toBeCloseTo(2 / 7, 5);
    expect(scheduledDensityPerDay(habit({ schedule: { type: "timesPerWeek", target: 3 } }))).toBeCloseTo(3 / 7, 5);
  });
});
