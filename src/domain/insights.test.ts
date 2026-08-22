import { describe, expect, it } from "vitest";
import { Insight, computeInsights, topInsights } from "./insights";
import { computeAnalytics } from "./analytics";
import { computeAllHabitStrengths } from "./automaticity";
import { computeAllHabitRisks } from "./recovery";
import { addDays } from "./date";
import { flattenHabits } from "./habits";
import { createInitialState } from "@/persistence/factory";
import { Commitment, DayRecord, Habit, TrackerState } from "@/persistence/types";

const DAY_ONE = "2026-01-01";
const TODAY = "2026-02-15";

function stateWith(patch: Partial<TrackerState> = {}): TrackerState {
  return { ...createInitialState("hash", DAY_ONE), ...patch };
}

/** Runs the whole pipeline the way the app does, so the tests exercise the
 * real composition rather than hand-built inputs. */
function insightsFor(state: TrackerState, todayKey = TODAY): Insight[] {
  const habits = flattenHabits(state.habitsByPillar);
  return computeInsights({
    analytics: computeAnalytics(state, todayKey),
    risks: computeAllHabitRisks(state, todayKey),
    strengths: computeAllHabitStrengths(habits, state.days, state.dayOneDate, todayKey),
    habits,
    commitments: state.commitments,
    todayKey,
  });
}

function kinds(insights: Insight[]): string[] {
  return insights.map((i) => i.kind);
}

/** Every seeded habit done, for `count` days ending yesterday. */
function fullDays(state: TrackerState, count: number, endKey = addDays(TODAY, -1)): Record<string, DayRecord> {
  const ticked: Record<string, boolean> = {};
  for (const h of flattenHabits(state.habitsByPillar)) ticked[h.id] = true;
  const days: Record<string, DayRecord> = {};
  for (let i = 0; i < count; i += 1) days[addDays(endKey, -i)] = { habits: { ...ticked }, journal: "" };
  return days;
}

describe("computeInsights", () => {
  it("returns nothing to act on for a brand-new account", () => {
    expect(insightsFor(stateWith(), DAY_ONE)).toEqual([]);
  });

  it("raises never-miss-twice, at the very top, after a single missed day", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 30), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    const insights = insightsFor(stateWith({ days }));
    expect(insights[0].kind).toBe("never-miss-twice");
    expect(insights[0].tone).toBe("act-now");
  });

  it("cites the evidence behind never-miss-twice rather than asserting it", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 30), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    const insight = insightsFor(stateWith({ days }))[0];
    expect(insight.evidence).toContain("Lally");
  });

  it("switches from nudging to shrinking the ask once a habit has lapsed", () => {
    const base = stateWith();
    const days = {
      ...fullDays(base, 30, addDays(TODAY, -5)),
      [addDays(TODAY, -1)]: { habits: {}, journal: "" },
      [addDays(TODAY, -2)]: { habits: {}, journal: "" },
      [addDays(TODAY, -3)]: { habits: {}, journal: "" },
      [addDays(TODAY, -4)]: { habits: {}, journal: "" },
    };
    const insights = insightsFor(stateWith({ days }));
    expect(kinds(insights)).toContain("lapsed");
    expect(kinds(insights)).not.toContain("never-miss-twice");
    expect(insights.find((i) => i.kind === "lapsed")!.tone).toBe("adjust");
  });

  it("never says the same habit is both lapsed and overscheduled", () => {
    const insights = insightsFor(stateWith({ days: fullDays(stateWith(), 0) }));
    const lapsed = new Set(insights.filter((i) => i.kind === "lapsed").map((i) => i.habitId));
    for (const over of insights.filter((i) => i.kind === "overscheduled")) {
      expect(lapsed.has(over.habitId)).toBe(false);
    }
  });

  it("suggests a cue for an uncued habit that keeps slipping", () => {
    const custom: Habit = {
      id: "custom-1",
      label: "Call my mother",
      metric: { type: "checkbox" },
      schedule: { type: "daily" },
      level: "target",
      activeFrom: DAY_ONE,
    };
    const base = stateWith();
    const state = stateWith({
      habitsByPillar: { ...base.habitsByPillar, mind: [...base.habitsByPillar.mind, custom] },
      // Full days for everything else; the custom habit is only ticked a third
      // of the time, which is what should draw the suggestion.
      days: Object.fromEntries(
        Object.entries(fullDays(base, 30)).map(([key, day], i) => [
          key,
          { ...day, habits: { ...day.habits, "custom-1": i % 3 === 0 } },
        ])
      ),
    });
    const cueInsight = insightsFor(state).find((i) => i.kind === "missing-cue");
    expect(cueInsight).toBeDefined();
    expect(cueInsight!.habitId).toBe("custom-1");
    expect(cueInsight!.evidence).toContain("implementation intention");
  });

  it("does not suggest a cue for a habit that already has one", () => {
    const insights = insightsFor(stateWith({ days: fullDays(stateWith(), 0) }));
    const seeded = new Set(flattenHabits(stateWith().habitsByPillar).filter((h) => h.cue).map((h) => h.id));
    for (const insight of insights.filter((i) => i.kind === "missing-cue")) {
      expect(seeded.has(insight.habitId!)).toBe(false);
    }
  });

  it("flags a promise whose date has passed while it's still open", () => {
    const commitments: Commitment[] = [
      { id: "c1", text: "I will call home", createdAt: "2026-01-02T09:00:00.000Z", targetDate: "2026-01-10", status: "pending" },
    ];
    expect(kinds(insightsFor(stateWith({ commitments })))).toContain("stale-promise");
  });

  it("leaves a promise alone while its date is still ahead", () => {
    const commitments: Commitment[] = [
      { id: "c1", text: "I will call home", createdAt: "2026-01-02T09:00:00.000Z", targetDate: "2026-03-01", status: "pending" },
    ];
    expect(kinds(insightsFor(stateWith({ commitments })))).not.toContain("stale-promise");
  });

  it("celebrates a habit that's nearly automatic, and ranks it last", () => {
    const base = stateWith();
    const insights = insightsFor(stateWith({ days: fullDays(base, 45) }));
    const affirmations = insights.filter((i) => i.kind === "nearly-automatic");
    expect(affirmations.length).toBeGreaterThan(0);
    expect(affirmations[0].tone).toBe("affirm");
    expect(insights[insights.length - 1].kind).toBe("nearly-automatic");
  });

  it("orders act-now before adjust before affirm", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 45), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    const insights = insightsFor(stateWith({ days }));
    const firstAffirm = insights.findIndex((i) => i.tone === "affirm");
    const lastActNow = insights.map((i) => i.tone).lastIndexOf("act-now");
    expect(lastActNow).toBeLessThan(firstAffirm);
  });

  it("gives every insight a stable, unique id", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 45), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    const state = stateWith({ days });
    const ids = insightsFor(state).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(insightsFor(state).map((i) => i.id)).toEqual(ids); // deterministic
  });

  it("never uses blaming language anywhere in its copy", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 20), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    for (const insight of insightsFor(stateWith({ days }))) {
      expect(`${insight.title} ${insight.body}`.toLowerCase()).not.toMatch(
        /you failed|lazy|no excuse|shame|pathetic/
      );
    }
  });
});

describe("topInsights", () => {
  it("shows at most one of each kind, so the day isn't a wall of advice", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 30), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    const top = topInsights(insightsFor(stateWith({ days })), 3);
    expect(new Set(kinds(top)).size).toBe(top.length);
    expect(top.length).toBeLessThanOrEqual(3);
  });

  it("keeps the highest-priority item first", () => {
    const base = stateWith();
    const days = { ...fullDays(base, 30), [addDays(TODAY, -1)]: { habits: {}, journal: "" } };
    expect(topInsights(insightsFor(stateWith({ days })), 3)[0].kind).toBe("never-miss-twice");
  });

  it("is safe on an empty list", () => {
    expect(topInsights([], 3)).toEqual([]);
  });
});
