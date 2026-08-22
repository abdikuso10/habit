import { describe, expect, it } from "vitest";
import { calcStreak, completionPct, computeDayLevels } from "./completion";
import { Habit, TrackerState } from "@/persistence/types";
import { createInitialState } from "@/persistence/factory";

function habit(id: string, level: Habit["level"] = "target", schedule: Habit["schedule"] = { type: "daily" }): Habit {
  return { id, label: id, metric: { type: "checkbox" }, schedule, level, activeFrom: "2026-01-01" };
}

describe("completionPct", () => {
  it("is 100% when nothing is scheduled that day (nothing was asked, nothing missed)", () => {
    expect(completionPct([], undefined, "2026-01-01")).toBe(100);
  });

  it("divides completed scheduled habits by total scheduled habits", () => {
    const habits = [habit("a"), habit("b"), habit("c")];
    const day = { habits: { a: true, b: true, c: false }, journal: "" };
    expect(completionPct(habits, day, "2026-01-05")).toBe(67);
  });

  it("excludes unscheduled habits from the denominator", () => {
    const habits = [habit("a", "target", { type: "daysOfWeek", days: [1] }), habit("b")];
    // 2026-01-06 is a Tuesday, so habit "a" (Mondays only) isn't scheduled.
    const day = { habits: { b: true }, journal: "" };
    expect(completionPct(habits, day, "2026-01-06")).toBe(100);
  });
});

describe("computeDayLevels", () => {
  it("tiers are cumulative: target includes minimum habits", () => {
    const habits = [habit("min1", "minimum"), habit("tgt1", "target")];
    const day = { habits: { min1: true, tgt1: false }, journal: "" };
    const levels = computeDayLevels(habits, day, "2026-01-05");
    expect(levels.minimum.met).toBe(true);
    expect(levels.target.met).toBe(false); // tgt1 not done yet
    expect(levels.target.scheduled).toBe(2); // includes min1
  });

  it("an empty tier reads as met (nothing required, nothing missed)", () => {
    const habits = [habit("tgt1", "target")];
    const day = { habits: { tgt1: true }, journal: "" };
    const levels = computeDayLevels(habits, day, "2026-01-05");
    expect(levels.minimum.met).toBe(true);
    expect(levels.minimum.scheduled).toBe(0);
  });
});

function baseState(): TrackerState {
  const state = createInitialState("hash", "2026-01-01");
  state.habitsByPillar.mind = [habit("focus")];
  state.habitsByPillar.spiritual = [];
  state.habitsByPillar.body = [];
  return state;
}

describe("calcStreak", () => {
  it("counts consecutive qualifying days ending today", () => {
    const state = baseState();
    state.days["2026-01-03"] = { habits: { focus: true }, journal: "" };
    state.days["2026-01-04"] = { habits: { focus: true }, journal: "" };
    state.days["2026-01-05"] = { habits: { focus: true }, journal: "" };
    expect(calcStreak(state, "2026-01-05")).toBe(3);
  });

  it("breaks on a day below threshold", () => {
    const state = baseState();
    state.days["2026-01-03"] = { habits: { focus: true }, journal: "" };
    state.days["2026-01-04"] = { habits: { focus: false }, journal: "" };
    state.days["2026-01-05"] = { habits: { focus: true }, journal: "" };
    expect(calcStreak(state, "2026-01-05")).toBe(1);
  });

  it("special days are skipped, not counted as breaking or extending the streak", () => {
    const state = baseState();
    state.days["2026-01-03"] = { habits: { focus: true }, journal: "" };
    state.days["2026-01-04"] = { habits: {}, journal: "", specialState: "sick" };
    state.days["2026-01-05"] = { habits: { focus: true }, journal: "" };
    expect(calcStreak(state, "2026-01-05")).toBe(2);
  });

  it("is zero before day one", () => {
    const state = baseState();
    expect(calcStreak(state, "2026-01-01")).toBe(0);
  });
});
