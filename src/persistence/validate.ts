import { TrackerState } from "./types";

/** A v5 state is structurally a v6 state without `cue` on habits. Because
 * `cue` is optional, the v6 `Habit` type describes both. */
export type LegacyTrackerStateV5 = Omit<TrackerState, "version"> & { version: 5 };

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function isHabitCue(v: unknown): boolean {
  if (!isRecord(v)) return false;
  for (const field of ["anchor", "time", "place"]) {
    if (v[field] !== undefined && typeof v[field] !== "string") return false;
  }
  if (v.allDay !== undefined && typeof v.allDay !== "boolean") return false;
  return true;
}

function isHabit(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.label !== "string") return false;
  if (!isRecord(v.metric) || typeof v.metric.type !== "string") return false;
  if (!isRecord(v.schedule) || typeof v.schedule.type !== "string") return false;
  if (typeof v.level !== "string") return false;
  if (typeof v.activeFrom !== "string") return false;
  // v6: optional, but if present it must be well-formed. An unreadable cue
  // must not be allowed to overwrite good data any more than a bad habit.
  if (v.cue !== undefined && !isHabitCue(v.cue)) return false;
  return true;
}

function isDayRecord(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (!isRecord(v.habits)) return false;
  if (typeof v.journal !== "string") return false;
  return true;
}

function isCommitment(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.text !== "string") return false;
  if (typeof v.createdAt !== "string") return false;
  const status = v.status;
  return status === "pending" || status === "kept" || status === "rescheduled" || status === "cancelled";
}

function isMoneyTransaction(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.date !== "string") return false;
  if (typeof v.amount !== "number" || !Number.isFinite(v.amount)) return false;
  if (typeof v.type !== "string" || typeof v.account !== "string") return false;
  return true;
}

/** Everything about a state except its version number — shared by the v5 and
 * v6 checks, since v6 adds only an optional field. */
function hasValidStateShape(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (typeof value.passwordHash !== "string") return false;
  if (typeof value.dayOneDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.dayOneDate)) return false;

  if (!isRecord(value.habitsByPillar)) return false;
  for (const pillar of ["spiritual", "body", "mind"]) {
    const list = value.habitsByPillar[pillar];
    if (!Array.isArray(list)) return false;
    if (!list.every(isHabit)) return false;
  }

  if (!isRecord(value.days)) return false;
  if (!Object.values(value.days).every(isDayRecord)) return false;

  if (!Array.isArray(value.commitments)) return false;
  if (!value.commitments.every(isCommitment)) return false;

  if (!isRecord(value.money) || !Array.isArray(value.money.transactions)) return false;
  if (!value.money.transactions.every(isMoneyTransaction)) return false;

  if (!isRecord(value.settings)) return false;
  const settings = value.settings;
  if (settings.locale !== "en" && settings.locale !== "ar") return false;
  if (!isRecord(settings.money)) return false;
  if (typeof settings.money.currency !== "string") return false;
  if (typeof settings.money.savingsGoal !== "number") return false;
  if (typeof settings.money.startingDebt !== "number") return false;
  if (typeof settings.focusTargetMinutes !== "number") return false;
  if (typeof settings.meditationDefaultMinutes !== "number") return false;

  if (value.timer !== null && value.timer !== undefined) {
    if (!isRecord(value.timer)) return false;
    if (value.timer.kind !== "focus" && value.timer.kind !== "meditation") return false;
    if (typeof value.timer.startedAt !== "string") return false;
  }

  return true;
}

/** Full structural validation of a v6 TrackerState. Intentionally strict:
 * anything that fails this must never be allowed to overwrite current data. */
export function isTrackerStateV6(value: unknown): value is TrackerState {
  return isRecord(value) && value.version === 6 && hasValidStateShape(value);
}

/** The same structural check pinned to version 5, so a stored or imported v5
 * state can be recognised and migrated rather than rejected. */
export function isTrackerStateV5(value: unknown): value is LegacyTrackerStateV5 {
  return isRecord(value) && value.version === 5 && hasValidStateShape(value);
}

export interface BackupSummary {
  dayOneDate: string;
  daysTracked: number;
  habitCount: number;
  commitmentCount: number;
  promisePoints: number;
  transactionCount: number;
  exportedAt?: string;
  schemaVersion: number;
  appName?: string;
}

export function summarizeBackup(state: TrackerState, meta?: { exportedAt?: string; appName?: string }): BackupSummary {
  const habitCount = Object.values(state.habitsByPillar).reduce((sum, list) => sum + list.length, 0);
  const kept = state.commitments.filter((c) => c.status === "kept").length;
  return {
    dayOneDate: state.dayOneDate,
    daysTracked: Object.keys(state.days).length,
    habitCount,
    commitmentCount: state.commitments.length,
    promisePoints: kept,
    transactionCount: state.money.transactions.length,
    exportedAt: meta?.exportedAt,
    schemaVersion: state.version,
    appName: meta?.appName,
  };
}
