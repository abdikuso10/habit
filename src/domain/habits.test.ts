import { describe, expect, it } from "vitest";
import { habitTargetValue, habitValueOnDay, isHabitCompletedOnDay, isHabitScheduledOnDay } from "./habits";
import { DayRecord, Habit } from "@/persistence/types";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "test",
    label: "Test habit",
    metric: { type: "checkbox" },
    schedule: { type: "daily" },
    level: "target",
    activeFrom: "2026-01-01",
    ...overrides,
  };
}

describe("isHabitScheduledOnDay", () => {
  it("schedules daily habits every day", () => {
    const habit = makeHabit({ schedule: { type: "daily" } });
    expect(isHabitScheduledOnDay(habit, "2026-01-05")).toBe(true);
    expect(isHabitScheduledOnDay(habit, "2026-01-10")).toBe(true);
  });

  it("schedules weekdays only on Mon-Fri", () => {
    const habit = makeHabit({ schedule: { type: "weekdays" } });
    expect(isHabitScheduledOnDay(habit, "2026-01-05")).toBe(true); // Monday
    expect(isHabitScheduledOnDay(habit, "2026-01-10")).toBe(false); // Saturday
    expect(isHabitScheduledOnDay(habit, "2026-01-04")).toBe(false); // Sunday
  });

  it("schedules specific days of week", () => {
    const habit = makeHabit({ schedule: { type: "daysOfWeek", days: [2, 4] } }); // Tue, Thu
    expect(isHabitScheduledOnDay(habit, "2026-01-06")).toBe(true); // Tuesday
    expect(isHabitScheduledOnDay(habit, "2026-01-05")).toBe(false); // Monday
  });

  it("never counts timesPerWeek habits toward a single day's denominator", () => {
    const habit = makeHabit({ schedule: { type: "timesPerWeek", target: 3 } });
    expect(isHabitScheduledOnDay(habit, "2026-01-05")).toBe(false);
  });

  it("excludes habits before their activeFrom date", () => {
    const habit = makeHabit({ activeFrom: "2026-02-01" });
    expect(isHabitScheduledOnDay(habit, "2026-01-15")).toBe(false);
    expect(isHabitScheduledOnDay(habit, "2026-02-01")).toBe(true);
  });

  it("excludes habits on/after their archive date, preserving history before it", () => {
    const habit = makeHabit({ archivedAt: "2026-03-01" });
    expect(isHabitScheduledOnDay(habit, "2026-02-28")).toBe(true);
    expect(isHabitScheduledOnDay(habit, "2026-03-01")).toBe(false);
    expect(isHabitScheduledOnDay(habit, "2026-03-02")).toBe(false);
  });

  it("excludes paused habits until pausedUntil passes", () => {
    const habit = makeHabit({ pausedUntil: "2026-01-10" });
    expect(isHabitScheduledOnDay(habit, "2026-01-05")).toBe(false);
    expect(isHabitScheduledOnDay(habit, "2026-01-10")).toBe(false);
    expect(isHabitScheduledOnDay(habit, "2026-01-11")).toBe(true);
  });
});

describe("habit completion by metric type", () => {
  it("checkbox habits read from day.habits", () => {
    const habit = makeHabit({ metric: { type: "checkbox" } });
    const day: DayRecord = { habits: { test: true }, journal: "" };
    expect(isHabitCompletedOnDay(habit, day)).toBe(true);
    expect(isHabitCompletedOnDay(habit, { habits: {}, journal: "" })).toBe(false);
  });

  it("count/amount habits compare habitValues to target", () => {
    const habit = makeHabit({ metric: { type: "count", target: 3, unit: "glasses" } });
    expect(habitTargetValue(habit.metric)).toBe(3);
    expect(isHabitCompletedOnDay(habit, { habits: {}, journal: "", habitValues: { test: 2 } })).toBe(false);
    expect(isHabitCompletedOnDay(habit, { habits: {}, journal: "", habitValues: { test: 3 } })).toBe(true);
    expect(isHabitCompletedOnDay(habit, { habits: {}, journal: "", habitValues: { test: 5 } })).toBe(true);
  });

  it("duration habits for the well-known deepWork id read focusSeconds", () => {
    const habit = makeHabit({ id: "deepWork", metric: { type: "duration", targetMinutes: 60 } });
    expect(habitValueOnDay(habit, { habits: {}, journal: "", focusSeconds: 30 * 60 })).toBe(30);
    expect(isHabitCompletedOnDay(habit, { habits: {}, journal: "", focusSeconds: 60 * 60 })).toBe(true);
    expect(isHabitCompletedOnDay(habit, { habits: {}, journal: "", focusSeconds: 59 * 60 })).toBe(false);
  });

  it("an undefined day record is never completed", () => {
    const habit = makeHabit();
    expect(isHabitCompletedOnDay(habit, undefined)).toBe(false);
  });
});
