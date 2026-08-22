import { describe, expect, it } from "vitest";
import { migrateV4ToV5 } from "./v4-to-v5";
import { debtRemaining, savingsTotal } from "@/domain/finance";
import { isHabitCompletedOnDay } from "@/domain/habits";
import { isTrackerStateV5 } from "../validate";
import { LegacyTrackerStateV4 } from "../legacyV4";

function legacyFixture(overrides: Partial<LegacyTrackerStateV4> = {}): LegacyTrackerStateV4 {
  return {
    version: 4,
    passwordHash: "abc123",
    dayOneDate: "2026-01-01",
    savingsTotal: 15000,
    debtRemaining: 68000, // started at 98000, so 30000 already paid
    habitsByPillar: {
      spiritual: [{ id: "fajr", label: "Fajr on time" }],
      body: [{ id: "gym", label: "Gym session" }],
      mind: [
        { id: "deepWork", label: "Deep work (4 hours)" },
        { id: "meditation", label: "Meditation" },
        { id: "myCustomHabit", label: "Something I added myself" },
      ],
    },
    days: {
      "2026-01-02": { habits: { fajr: true, gym: false }, journal: "Day two.", deepWorkSeconds: 14400 },
    },
    ...overrides,
  };
}

describe("migrateV4ToV5", () => {
  it("preserves identity fields", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    expect(migrated.version).toBe(5);
    expect(migrated.passwordHash).toBe("abc123");
    expect(migrated.dayOneDate).toBe("2026-01-01");
  });

  it("produces a structurally valid v5 state", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    expect(isTrackerStateV5(migrated)).toBe(true);
  });

  it("starts with an empty commitment history for old data", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    expect(migrated.commitments).toEqual([]);
  });

  it("keeps the deepWork habit's 4-hour target (migratable) without forcing it as the new default", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    const deepWork = migrated.habitsByPillar.mind.find((h) => h.id === "deepWork")!;
    expect(deepWork.metric).toEqual({ type: "duration", targetMinutes: 240 });
    expect(migrated.settings.focusTargetMinutes).not.toBe(240);
  });

  it("preserves focus history and its completion meaning", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    const deepWork = migrated.habitsByPillar.mind.find((h) => h.id === "deepWork")!;
    const day = migrated.days["2026-01-02"];
    expect(day.focusSeconds).toBe(14400);
    expect(isHabitCompletedOnDay(deepWork, day)).toBe(true); // was true pre-migration too
  });

  it("keeps meditation a checkbox habit so its history isn't reinterpreted", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    const meditation = migrated.habitsByPillar.mind.find((h) => h.id === "meditation")!;
    expect(meditation.metric).toEqual({ type: "checkbox" });
  });

  it("carries over custom user-added habits as checkbox/daily/target", () => {
    const migrated = migrateV4ToV5(legacyFixture());
    const custom = migrated.habitsByPillar.mind.find((h) => h.id === "myCustomHabit")!;
    expect(custom.metric).toEqual({ type: "checkbox" });
    expect(custom.schedule).toEqual({ type: "daily" });
    expect(custom.level).toBe("target");
  });

  it("converts old financial totals into opening transactions that reconcile exactly", () => {
    const legacy = legacyFixture({ savingsTotal: 15000, debtRemaining: 68000 });
    const migrated = migrateV4ToV5(legacy);
    expect(savingsTotal(migrated.money.transactions)).toBe(15000);
    expect(debtRemaining(migrated.money.transactions, migrated.settings.money.startingDebt)).toBe(68000);
  });

  it("handles zero savings and full starting debt without creating spurious transactions", () => {
    const legacy = legacyFixture({ savingsTotal: 0, debtRemaining: 98000 });
    const migrated = migrateV4ToV5(legacy);
    expect(migrated.money.transactions).toEqual([]);
    expect(savingsTotal(migrated.money.transactions)).toBe(0);
    expect(debtRemaining(migrated.money.transactions, migrated.settings.money.startingDebt)).toBe(98000);
  });

  it("is deterministic and idempotent: running it twice on the same input is byte-identical", () => {
    const legacy = legacyFixture();
    const first = migrateV4ToV5(legacy);
    const second = migrateV4ToV5(legacy);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
