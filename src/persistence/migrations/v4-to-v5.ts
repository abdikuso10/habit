// Deterministic, pure v4 -> v5 migration. No Date.now()/Math.random() calls,
// so running it twice on the same v4 input produces byte-identical v5 output
// (idempotent by construction). The caller (repository.ts) additionally
// guards this by only invoking it when `version === 4`, so it can never run
// twice on the same stored state.

import {
  LegacyDayRecord,
  LegacyHabitDef,
  LegacyTrackerStateV4,
  LEGACY_DEEP_WORK_TARGET_SECONDS,
  LEGACY_SAVINGS_GOAL,
  LEGACY_STARTING_DEBT,
} from "../legacyV4";
import { DayRecord, Habit, HabitLevel, MoneyTransaction, PillarId } from "../types";
import { LegacyTrackerStateV5 } from "../validate";

// Known seed habit ids get the same level assignment the current default
// seed list uses, so migrated accounts read the same as fresh ones for the
// habits they share. Anything else (a habit the user added themselves) gets
// a neutral "target" level — we have no basis to guess minimum vs. stretch.
const SEED_LEVELS: Record<string, HabitLevel> = {
  fajr: "minimum",
  dhuhr: "minimum",
  asr: "minimum",
  maghrib: "minimum",
  isha: "minimum",
  quran: "target",
  istighfar: "target",
  gym: "target",
  noKhat: "minimum",
  noShisha: "minimum",
  noAlcohol: "minimum",
  bedBy11: "target",
  water: "minimum",
  focus25: "target",
  deepWork: "stretch",
  reading: "target",
  noImpulseSpending: "minimum",
  journal: "target",
  meditation: "target",
};

function migrateHabit(def: LegacyHabitDef, dayOneDate: string): Habit {
  const level = SEED_LEVELS[def.id] ?? "target";
  if (def.id === "deepWork") {
    return {
      id: def.id,
      label: def.label,
      jp: def.jp,
      metric: { type: "duration", targetMinutes: LEGACY_DEEP_WORK_TARGET_SECONDS / 60 },
      schedule: { type: "daily" },
      level,
      activeFrom: dayOneDate,
    };
  }
  return {
    id: def.id,
    label: def.label,
    jp: def.jp,
    metric: { type: "checkbox" },
    schedule: { type: "daily" },
    level,
    activeFrom: dayOneDate,
  };
}

function migrateDay(day: LegacyDayRecord): DayRecord {
  const migrated: DayRecord = { habits: { ...day.habits }, journal: day.journal };
  if (day.deepWorkSeconds) migrated.focusSeconds = day.deepWorkSeconds;
  return migrated;
}

function stableId(seed: string): string {
  // Deterministic id derived from fixed inputs (no crypto.randomUUID/Date.now)
  // so the migration stays pure and idempotent.
  return `migrated-${seed}`;
}

function openingTransactions(legacy: LegacyTrackerStateV4): MoneyTransaction[] {
  const createdAt = `${legacy.dayOneDate}T00:00:00.000Z`;
  const txs: MoneyTransaction[] = [];

  if (legacy.savingsTotal > 0) {
    txs.push({
      id: stableId("savings-opening"),
      date: legacy.dayOneDate,
      createdAt,
      type: "saving",
      account: "savings",
      amount: legacy.savingsTotal,
      note: "Migrated balance from v4",
    });
  }

  const netPaid = LEGACY_STARTING_DEBT - legacy.debtRemaining;
  if (netPaid > 0) {
    txs.push({
      id: stableId("debt-opening-payment"),
      date: legacy.dayOneDate,
      createdAt,
      type: "debt-payment",
      account: "debt",
      amount: netPaid,
      note: "Migrated payments from v4",
    });
  } else if (netPaid < 0) {
    txs.push({
      id: stableId("debt-opening-increase"),
      date: legacy.dayOneDate,
      createdAt,
      type: "debt-increase",
      account: "debt",
      amount: -netPaid,
      note: "Migrated balance from v4",
    });
  }

  return txs;
}

export function migrateV4ToV5(legacy: LegacyTrackerStateV4): LegacyTrackerStateV5 {
  const pillars: PillarId[] = ["spiritual", "body", "mind"];
  const habitsByPillar = Object.fromEntries(
    pillars.map((p) => [p, (legacy.habitsByPillar[p] ?? []).map((h) => migrateHabit(h, legacy.dayOneDate))])
  ) as Record<PillarId, Habit[]>;

  const days = Object.fromEntries(
    Object.entries(legacy.days).map(([key, day]) => [key, migrateDay(day)])
  );

  return {
    version: 5,
    passwordHash: legacy.passwordHash,
    dayOneDate: legacy.dayOneDate,
    habitsByPillar,
    days,
    commitments: [],
    money: { transactions: openingTransactions(legacy) },
    settings: {
      locale: "en",
      money: {
        currency: "KES",
        savingsGoal: LEGACY_SAVINGS_GOAL,
        startingDebt: LEGACY_STARTING_DEBT,
      },
      focusTargetMinutes: 90,
      meditationDefaultMinutes: 10,
    },
    timer: null,
  };
}
