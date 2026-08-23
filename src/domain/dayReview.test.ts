import { describe, expect, it } from "vitest";
import { POOR_SECTOR_THRESHOLD, computeDayReview } from "./dayReview";
import { DayRecord, Habit, PillarId, SpecialDayState, TrackerState } from "@/persistence/types";

const DAY_ONE = "2026-01-01";
const YESTERDAY = "2026-01-10";
const TODAY = "2026-01-11";

function habit(id: string): Habit {
  return {
    id,
    label: id,
    metric: { type: "checkbox" },
    schedule: { type: "daily" },
    level: "target",
    activeFrom: DAY_ONE,
  };
}

/** `done` lists the habit ids ticked on YESTERDAY. */
function makeState(
  habitsByPillar: Partial<Record<PillarId, string[]>>,
  done: string[] = [],
  dayPatch: Partial<DayRecord> = {}
): TrackerState {
  const day: DayRecord = {
    habits: Object.fromEntries(done.map((id) => [id, true])),
    journal: "",
    ...dayPatch,
  };
  return {
    version: 6,
    passwordHash: "x",
    dayOneDate: DAY_ONE,
    habitsByPillar: {
      spiritual: (habitsByPillar.spiritual ?? []).map(habit),
      body: (habitsByPillar.body ?? []).map(habit),
      mind: (habitsByPillar.mind ?? []).map(habit),
    },
    days: { [YESTERDAY]: day },
    commitments: [],
    money: { transactions: [] },
    settings: {
      locale: "en",
      money: { currency: "KES", savingsGoal: 1, startingDebt: 0 },
      focusTargetMinutes: 240,
      meditationDefaultMinutes: 10,
    },
    timer: null,
  };
}

describe("computeDayReview", () => {
  it("reports on the day before today, not today", () => {
    const review = computeDayReview(makeState({ body: ["gym"] }), TODAY);
    expect(review?.dateKey).toBe(YESTERDAY);
  });

  it("names the weakest sector that actually asked something", () => {
    // spiritual 2/2, body 0/2, mind 1/1
    const state = makeState(
      { spiritual: ["fajr", "dhuhr"], body: ["gym", "walk"], mind: ["read"] },
      ["fajr", "dhuhr", "read"]
    );
    const review = computeDayReview(state, TODAY);
    expect(review?.weakest?.id).toBe("body");
    expect(review?.weakest?.completed).toBe(0);
    expect(review?.weakest?.scheduled).toBe(2);
  });

  it("calls a sector poor below the threshold and asks for improvement", () => {
    const state = makeState({ body: ["gym", "walk", "stretch", "swim"] }, ["gym"]);
    const review = computeDayReview(state, TODAY);
    expect(review?.weakest?.pct).toBeLessThan(POOR_SECTOR_THRESHOLD);
    expect(review?.poor).toBe(true);
    expect(review?.body).toContain("You performed poorly in this sector");
    expect(review?.body).toContain("Please improve on this today");
  });

  it("does not call a sector poor at or above the threshold", () => {
    // 1 of 2 = 50%, which is the threshold itself and so not "poor".
    const state = makeState({ body: ["gym", "walk"] }, ["gym"]);
    const review = computeDayReview(state, TODAY);
    expect(review?.weakest?.pct).toBe(POOR_SECTOR_THRESHOLD);
    expect(review?.poor).toBe(false);
    expect(review?.body).not.toContain("poorly");
  });

  it("says so when the whole day was completed", () => {
    const state = makeState({ spiritual: ["fajr"], body: ["gym"] }, ["fajr", "gym"]);
    const review = computeDayReview(state, TODAY);
    expect(review?.overallPct).toBe(100);
    expect(review?.headline).toBe("Yesterday was complete.");
    expect(review?.body).not.toContain("poorly");
  });

  it("weights overall completion by habit count, not by sector", () => {
    // spiritual 0/3, body 1/1 -> 1 of 4 overall, not the 50% a sector average gives.
    const state = makeState({ spiritual: ["fajr", "dhuhr", "asr"], body: ["gym"] }, ["gym"]);
    expect(computeDayReview(state, TODAY)?.overallPct).toBe(25);
  });

  it("excuses special days rather than scoring them", () => {
    for (const special of ["rest", "sick", "travel", "recovery"] as SpecialDayState[]) {
      const state = makeState({ body: ["gym"] }, [], { specialState: special });
      expect(computeDayReview(state, TODAY)).toBeNull();
    }
  });

  it("still scores a day explicitly marked normal", () => {
    const state = makeState({ body: ["gym"] }, [], { specialState: "normal" });
    expect(computeDayReview(state, TODAY)).not.toBeNull();
  });

  it("returns null for the day before day one", () => {
    const state = makeState({ body: ["gym"] });
    expect(computeDayReview(state, DAY_ONE)).toBeNull();
  });

  it("returns null when nothing was scheduled at all", () => {
    expect(computeDayReview(makeState({}), TODAY)).toBeNull();
  });

  it("ignores sectors that asked nothing when picking the weakest", () => {
    // mind has no habits; it must not win "weakest" with a vacuous 100 or 0.
    const state = makeState({ spiritual: ["fajr"], body: ["gym", "walk"] }, ["fajr"]);
    const review = computeDayReview(state, TODAY);
    expect(review?.weakest?.id).toBe("body");
    expect(review?.sectors.find((s) => s.id === "mind")?.scheduled).toBe(0);
  });

  it("breaks ties by PILLARS_META order so the same day reports the same way", () => {
    const state = makeState({ spiritual: ["fajr"], body: ["gym"] }, []);
    expect(computeDayReview(state, TODAY)?.weakest?.id).toBe("spiritual");
  });

  it("counts a habit not yet active on that day as unscheduled", () => {
    const state = makeState({ body: ["gym"] });
    state.habitsByPillar.body[0].activeFrom = TODAY;
    expect(computeDayReview(state, TODAY)).toBeNull();
  });
});
