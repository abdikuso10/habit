// The v4 schema, frozen exactly as it shipped, so migration and backup
// import can keep reading it even after domain code moves on to v5.

export type LegacyPillarId = "spiritual" | "body" | "mind";

export interface LegacyHabitDef {
  id: string;
  label: string;
  jp?: string;
}

export interface LegacyDayRecord {
  habits: Record<string, boolean>;
  journal: string;
  deepWorkSeconds?: number;
}

export const LEGACY_SAVINGS_GOAL = 1_000_000;
export const LEGACY_STARTING_DEBT = 98_000;
export const LEGACY_DEEP_WORK_TARGET_SECONDS = 4 * 60 * 60;

export interface LegacyTrackerStateV4 {
  version: 4;
  passwordHash: string;
  dayOneDate: string;
  savingsTotal: number;
  debtRemaining: number;
  habitsByPillar: Record<LegacyPillarId, LegacyHabitDef[]>;
  days: Record<string, LegacyDayRecord>;
}

export function isLegacyTrackerStateV4(value: unknown): value is LegacyTrackerStateV4 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 4) return false;
  if (typeof v.passwordHash !== "string") return false;
  if (typeof v.dayOneDate !== "string") return false;
  if (typeof v.savingsTotal !== "number") return false;
  if (typeof v.debtRemaining !== "number") return false;
  if (!v.habitsByPillar || typeof v.habitsByPillar !== "object") return false;
  const hbp = v.habitsByPillar as Record<string, unknown>;
  if (!Array.isArray(hbp.spiritual) || !Array.isArray(hbp.body) || !Array.isArray(hbp.mind))
    return false;
  if (!v.days || typeof v.days !== "object") return false;
  return true;
}
