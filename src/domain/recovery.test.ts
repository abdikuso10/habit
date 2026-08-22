import { describe, expect, it } from "vitest";
import { computeDayRecovery, computeHabitRisk, neverMissTwiceHabits } from "./recovery";
import { addDays } from "./date";
import { createInitialState } from "@/persistence/factory";
import { DayRecord, Habit, TrackerState } from "@/persistence/types";

const DAY_ONE = "2026-01-01";
const TODAY = "2026-01-15";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    label: "Habit",
    metric: { type: "checkbox" },
    schedule: { type: "daily" },
    level: "target",
    activeFrom: DAY_ONE,
    ...overrides,
  };
}

/**
 * `pattern` maps back from yesterday: index 0 is yesterday, 1 the day before.
 * Every earlier day back to day one is filled in as complete, because a day
 * with no record at all genuinely *is* a miss — leaving them out would test a
 * fourteen-day gap while pretending to test one light day.
 */
function daysEndingYesterday(pattern: boolean[], id = "h"): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = {};
  let cursor = addDays(TODAY, -1);
  for (const done of pattern) {
    out[cursor] = { habits: { [id]: done }, journal: "" };
    cursor = addDays(cursor, -1);
  }
  while (cursor >= DAY_ONE) {
    out[cursor] = { habits: { [id]: true }, journal: "" };
    cursor = addDays(cursor, -1);
  }
  return out;
}

describe("computeHabitRisk", () => {
  it("is on-track when the last scheduled day was kept", () => {
    const risk = computeHabitRisk(habit(), daysEndingYesterday([true, true]), DAY_ONE, TODAY);
    expect(risk.status).toBe("on-track");
    expect(risk.consecutiveMisses).toBe(0);
  });

  it("flags exactly one miss as the never-miss-twice moment", () => {
    const risk = computeHabitRisk(habit(), daysEndingYesterday([false, true, true]), DAY_ONE, TODAY);
    expect(risk.status).toBe("missed-once");
    expect(risk.consecutiveMisses).toBe(1);
    expect(risk.isNeverMissTwiceMoment).toBe(true);
  });

  it("escalates to missed-twice, then lapsed", () => {
    expect(computeHabitRisk(habit(), daysEndingYesterday([false, false, true]), DAY_ONE, TODAY).status).toBe(
      "missed-twice"
    );
    expect(
      computeHabitRisk(habit(), daysEndingYesterday([false, false, false, true]), DAY_ONE, TODAY).status
    ).toBe("lapsed");
  });

  it("never counts today as a miss — the day isn't over", () => {
    const days = { ...daysEndingYesterday([true, true]), [TODAY]: { habits: { h: false }, journal: "" } };
    const risk = computeHabitRisk(habit(), days, DAY_ONE, TODAY);
    expect(risk.status).toBe("on-track");
  });

  it("skips excused days instead of counting them against the user", () => {
    const days: Record<string, DayRecord> = {
      [addDays(TODAY, -1)]: { habits: {}, journal: "", specialState: "sick" },
      [addDays(TODAY, -2)]: { habits: {}, journal: "", specialState: "travel" },
      [addDays(TODAY, -3)]: { habits: { h: true }, journal: "" },
    };
    const risk = computeHabitRisk(habit(), days, DAY_ONE, TODAY);
    expect(risk.status).toBe("on-track");
    expect(risk.consecutiveMisses).toBe(0);
  });

  it("skips days the habit wasn't scheduled on", () => {
    // Mondays only: the ten unscheduled days since must not read as misses.
    const risk = computeHabitRisk(
      habit({ schedule: { type: "daysOfWeek", days: [1] } }),
      { "2026-01-12": { habits: { h: true }, journal: "" } }, // a Monday
      DAY_ONE,
      TODAY
    );
    expect(risk.status).toBe("on-track");
    expect(risk.lastCompletedDate).toBe("2026-01-12");
  });

  it("reports no-history before the first opportunity has passed", () => {
    const risk = computeHabitRisk(habit({ activeFrom: TODAY }), {}, DAY_ONE, TODAY);
    expect(risk.status).toBe("no-history");
    expect(risk.isNeverMissTwiceMoment).toBe(false);
  });

  it("treats timesPerWeek habits as on-track — daily misses aren't meaningful for them", () => {
    const risk = computeHabitRisk(
      habit({ schedule: { type: "timesPerWeek", target: 3 } }),
      daysEndingYesterday([false, false, false]),
      DAY_ONE,
      TODAY
    );
    expect(risk.status).toBe("on-track");
    expect(risk.isNeverMissTwiceMoment).toBe(false);
  });

  it("only calls it a never-miss-twice moment if the habit is scheduled today", () => {
    // Scheduled Mondays; 2026-01-15 is a Thursday, so nothing can be done today.
    const risk = computeHabitRisk(
      habit({ schedule: { type: "daysOfWeek", days: [1] } }),
      {
        "2026-01-12": { habits: { h: false }, journal: "" }, // Monday, missed
        "2026-01-05": { habits: { h: true }, journal: "" }, // Monday, kept
      },
      DAY_ONE,
      TODAY
    );
    expect(risk.consecutiveMisses).toBe(1);
    expect(risk.isNeverMissTwiceMoment).toBe(false);
  });

  it("terminates on a habit whose activeFrom is after today", () => {
    expect(() => computeHabitRisk(habit({ activeFrom: "2027-01-01" }), {}, DAY_ONE, TODAY)).not.toThrow();
  });
});

describe("neverMissTwiceHabits", () => {
  it("returns only the habits where acting today prevents a second miss", () => {
    const risks = [
      computeHabitRisk(habit({ id: "a", label: "A" }), daysEndingYesterday([false, true], "a"), DAY_ONE, TODAY),
      computeHabitRisk(habit({ id: "b", label: "B" }), daysEndingYesterday([true, true], "b"), DAY_ONE, TODAY),
    ];
    expect(neverMissTwiceHabits(risks).map((r) => r.habitId)).toEqual(["a"]);
  });
});

describe("computeDayRecovery", () => {
  function stateWith(days: Record<string, DayRecord>): TrackerState {
    const state = createInitialState("hash", DAY_ONE);
    return { ...state, days };
  }

  it("reads as a fresh start with no finished days behind it", () => {
    const recovery = computeDayRecovery(stateWith({}), DAY_ONE);
    expect(recovery.status).toBe("fresh-start");
    expect(recovery.previousDayPct).toBeNull();
  });

  /** Every seeded habit ticked — a day that clears the threshold outright. */
  function fullDay(): DayRecord {
    const habits: Record<string, boolean> = {};
    for (const list of Object.values(createInitialState("hash", DAY_ONE).habitsByPillar)) {
      for (const h of list) habits[h.id] = true;
    }
    return { habits, journal: "" };
  }

  /** `lightDays` empty days ending yesterday, every earlier day full. */
  function historyWith(lightDays: number): Record<string, DayRecord> {
    const days: Record<string, DayRecord> = {};
    let cursor = addDays(TODAY, -1);
    for (let i = 0; i < lightDays; i += 1) {
      days[cursor] = { habits: {}, journal: "" };
      cursor = addDays(cursor, -1);
    }
    while (cursor >= DAY_ONE) {
      days[cursor] = fullDay();
      cursor = addDays(cursor, -1);
    }
    return days;
  }

  it("is steady when yesterday cleared the threshold", () => {
    const recovery = computeDayRecovery(stateWith(historyWith(0)), TODAY);
    expect(recovery.status).toBe("steady");
  });

  it("says never miss twice after exactly one light day", () => {
    const recovery = computeDayRecovery(stateWith(historyWith(1)), TODAY);
    expect(recovery.status).toBe("recovering");
    expect(recovery.headline).toBe("Never miss twice");
    expect(recovery.consecutiveBelowThresholdDays).toBe(1);
  });

  it("shifts to rebuilding, and suggests the minimum only, after several", () => {
    const recovery = computeDayRecovery(stateWith(historyWith(3)), TODAY);
    expect(recovery.status).toBe("rebuilding");
    expect(recovery.body).toContain("minimum");
  });

  it("treats an account with no history at all as a fresh start", () => {
    // Backdating day one must not greet a brand-new account with weeks of
    // "quiet days" it was never around for.
    const recovery = computeDayRecovery(stateWith({}), TODAY);
    expect(recovery.status).toBe("fresh-start");
  });

  it("counts a gap that follows real history as quiet days", () => {
    // Recorded through day one week, then nothing since.
    const days: Record<string, DayRecord> = {};
    for (let i = 0; i < 5; i += 1) days[addDays(DAY_ONE, i)] = fullDay();
    const recovery = computeDayRecovery(stateWith(days), TODAY);
    expect(recovery.status).toBe("rebuilding");
    expect(recovery.consecutiveBelowThresholdDays).toBeGreaterThan(1);
  });

  it("never blames the user in any of its copy", () => {
    const states = [
      computeDayRecovery(stateWith({}), DAY_ONE),
      computeDayRecovery(stateWith({ [addDays(TODAY, -1)]: { habits: {}, journal: "" } }), TODAY),
      computeDayRecovery(stateWith({}), TODAY),
      computeDayRecovery(stateWith(historyWith(4)), TODAY),
    ];
    for (const s of states) {
      expect(`${s.headline} ${s.body}`.toLowerCase()).not.toMatch(/fail|lazy|broke your|excuse/);
    }
  });
});
