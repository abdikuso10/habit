import { describe, expect, it } from "vitest";
import { migrateV5ToV6 } from "./v5-to-v6";
import { SEED_HABIT_CUES } from "@/domain/cues";
import { createInitialState } from "../factory";
import { Habit, TrackerState } from "../types";
import { LegacyTrackerStateV5, isTrackerStateV6 } from "../validate";

/** A v5 state is the current shape minus habit cues, pinned to version 5. */
function v5State(habitOverrides: Partial<Habit>[] = []): LegacyTrackerStateV5 {
  const current = createInitialState("hash", "2026-01-01");
  const stripCue = (habit: Habit): Habit => {
    const copy = { ...habit };
    delete copy.cue;
    return copy;
  };
  return {
    ...current,
    version: 5,
    habitsByPillar: {
      spiritual: current.habitsByPillar.spiritual.map(stripCue),
      body: current.habitsByPillar.body.map(stripCue),
      mind: [...current.habitsByPillar.mind.map(stripCue), ...(habitOverrides as Habit[])],
    },
  };
}

function allHabits(state: TrackerState): Habit[] {
  return [...state.habitsByPillar.spiritual, ...state.habitsByPillar.body, ...state.habitsByPillar.mind];
}

describe("migrateV5ToV6", () => {
  it("produces a state the strict v6 validator accepts", () => {
    expect(isTrackerStateV6(migrateV5ToV6(v5State()))).toBe(true);
  });

  it("bumps the version to 6", () => {
    expect(migrateV5ToV6(v5State()).version).toBe(6);
  });

  it("gives every known seed habit its anchor, so upgraded accounts get a real timeline", () => {
    const migrated = migrateV5ToV6(v5State());
    for (const [id, cue] of Object.entries(SEED_HABIT_CUES)) {
      const habit = allHabits(migrated).find((h) => h.id === id);
      expect(habit, id).toBeDefined();
      expect(habit!.cue?.anchor, id).toBe(cue.anchor);
    }
  });

  it("leaves habits the user created uncued rather than guessing for them", () => {
    const custom: Partial<Habit> = {
      id: "custom-1",
      label: "Call my mother",
      metric: { type: "checkbox" },
      schedule: { type: "daily" },
      level: "target",
      activeFrom: "2026-01-01",
    };
    const migrated = migrateV5ToV6(v5State([custom]));
    expect(allHabits(migrated).find((h) => h.id === "custom-1")?.cue).toBeUndefined();
  });

  it("never overwrites a cue that is already set", () => {
    const state = v5State();
    state.habitsByPillar.spiritual[0] = {
      ...state.habitsByPillar.spiritual[0],
      cue: { anchor: "night", place: "kitchen" },
    };
    const migrated = migrateV5ToV6(state);
    expect(migrated.habitsByPillar.spiritual[0].cue).toEqual({ anchor: "night", place: "kitchen" });
  });

  it("is idempotent — re-running on its own output changes nothing", () => {
    const once = migrateV5ToV6(v5State());
    const twice = migrateV5ToV6({ ...once, version: 5 });
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("is deterministic — no clock or randomness in the output", () => {
    const input = v5State();
    expect(JSON.stringify(migrateV5ToV6(input))).toBe(JSON.stringify(migrateV5ToV6(input)));
  });

  it("carries days, commitments, money and settings through untouched", () => {
    const state: LegacyTrackerStateV5 = {
      ...v5State(),
      days: { "2026-01-02": { habits: { fajr: true }, journal: "kept going" } },
      commitments: [
        { id: "c1", text: "I will call home", createdAt: "2026-01-02T09:00:00.000Z", status: "kept", keptAt: "2026-01-02T20:00:00.000Z" },
      ],
      money: {
        transactions: [
          { id: "t1", date: "2026-01-02", createdAt: "2026-01-02T09:00:00.000Z", type: "saving", account: "savings", amount: 500 },
        ],
      },
    };
    const migrated = migrateV5ToV6(state);
    expect(migrated.days).toEqual(state.days);
    expect(migrated.commitments).toEqual(state.commitments);
    expect(migrated.money).toEqual(state.money);
    expect(migrated.settings).toEqual(state.settings);
    expect(migrated.passwordHash).toBe(state.passwordHash);
    expect(migrated.dayOneDate).toBe(state.dayOneDate);
  });

  it("preserves promise points exactly — they're derived from kept commitments", () => {
    const state: LegacyTrackerStateV5 = {
      ...v5State(),
      commitments: [
        { id: "a", text: "one", createdAt: "2026-01-02T09:00:00.000Z", status: "kept" },
        { id: "b", text: "two", createdAt: "2026-01-02T09:00:00.000Z", status: "kept" },
        { id: "c", text: "three", createdAt: "2026-01-02T09:00:00.000Z", status: "pending" },
      ],
    };
    const migrated = migrateV5ToV6(state);
    expect(migrated.commitments.filter((c) => c.status === "kept").length).toBe(2);
  });

  it("handles a pillar array being absent without throwing", () => {
    const state = v5State();
    // Hand-edited or truncated backups really do turn up like this.
    delete (state.habitsByPillar as Partial<typeof state.habitsByPillar>).body;
    expect(() => migrateV5ToV6(state)).not.toThrow();
    expect(migrateV5ToV6(state).habitsByPillar.body).toEqual([]);
  });
});
