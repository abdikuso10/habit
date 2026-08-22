// Schema v6. See MIGRATIONS.md for the v4 -> v5 -> v6 migration story.
// Nothing in this file should read localStorage directly — that lives in
// repository.ts.

export type PillarId = "spiritual" | "body" | "mind";

export interface PillarMeta {
  id: PillarId;
  title: string;
  arabic: string;
}

export const PILLARS_META: PillarMeta[] = [
  { id: "spiritual", title: "Spiritual", arabic: "الروح" },
  { id: "body", title: "Body", arabic: "الجسد" },
  { id: "mind", title: "Mind", arabic: "العقل" },
];

export type HabitLevel = "minimum" | "target" | "stretch";

export type HabitMetric =
  | { type: "checkbox" }
  | { type: "count"; target: number; unit: string }
  | { type: "duration"; targetMinutes: number }
  | { type: "amount"; target: number; unit: string };

export type HabitSchedule =
  | { type: "daily" }
  | { type: "weekdays" }
  | { type: "daysOfWeek"; days: number[] } // 0=Sunday .. 6=Saturday
  | { type: "timesPerWeek"; target: number };

/**
 * The "when" half of an implementation intention. Added in v6.
 *
 * A cue is what turns a good intention into a habit: automaticity is built by
 * repeating a behaviour after a *consistent* cue, not merely by repeating it.
 * Every field is optional because some habits genuinely have no single
 * trigger — an all-day abstention ("no khat today") is held continuously
 * rather than started at a moment, and inventing a cue for it would be a lie.
 * See src/domain/cues.ts for the anchor vocabulary and the research behind it.
 */
export interface HabitCue {
  /** A recurring moment in the day, e.g. "fajr" — see DayAnchor in domain/cues. */
  anchor?: string;
  /** Optional clock time, "HH:MM", to sharpen the plan. */
  time?: string;
  /** Optional location — the third element of a full implementation intention. */
  place?: string;
  /**
   * Set when the user has decided this habit genuinely has no trigger — an
   * abstention held across the whole day rather than started at a moment.
   * Distinct from an absent cue, which means "not chosen yet": the app nudges
   * you to pick a cue in that case, and must not nag about this one.
   */
  allDay?: boolean;
}

export interface Habit {
  id: string;
  label: string;
  jp?: string;
  metric: HabitMetric;
  schedule: HabitSchedule;
  level: HabitLevel;
  /** YYYY-MM-DD the habit starts counting from (doesn't rewrite earlier history). */
  activeFrom: string;
  /** Set when archived. History before/after this date is preserved untouched. */
  archivedAt?: string;
  /** Set when temporarily paused; paused habits are not scheduled until this date passes. */
  pausedUntil?: string;
  /** v6: the cue this habit is anchored to. Optional by design — see HabitCue. */
  cue?: HabitCue;
}

export type CommitmentStatus = "pending" | "kept" | "rescheduled" | "cancelled";

export interface Commitment {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
  targetDate?: string; // YYYY-MM-DD
  targetTime?: string; // HH:MM
  pillarId?: PillarId;
  status: CommitmentStatus;
  keptAt?: string; // ISO timestamp
  cancelledAt?: string; // ISO timestamp
  rescheduledAt?: string; // ISO timestamp
  rescheduledFromId?: string;
  note?: string;
}

export type SpecialDayState = "normal" | "rest" | "sick" | "travel" | "recovery";

export interface DayRecord {
  /** Checkbox-metric completion, and the historical v4 shape. */
  habits: Record<string, boolean>;
  /** Count/duration/amount progress, keyed by habit id, in the habit's unit (minutes for duration). */
  habitValues?: Record<string, number>;
  journal: string;
  journalFavorite?: boolean;
  journalUpdatedAt?: string; // ISO timestamp, for "last saved" status
  reflection?: string;
  /** Seconds accumulated by the Focus timer this day (drives the "deepWork" habit if present). */
  focusSeconds?: number;
  /** Seconds accumulated by the Meditation timer this day (drives the "meditation" habit if present). */
  meditationSeconds?: number;
  /** undefined/"normal" = an ordinary day. */
  specialState?: SpecialDayState;
  intention?: string;
}

export type MoneyAccount = "savings" | "debt";

export type MoneyTransactionType =
  | "saving"
  | "withdrawal"
  | "debt-payment"
  | "debt-increase"
  | "adjustment";

export interface MoneyTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  type: MoneyTransactionType;
  account: MoneyAccount;
  /** Magnitude for saving/withdrawal/debt-payment/debt-increase. Signed for adjustment. */
  amount: number;
  note?: string;
}

export interface MoneySettings {
  currency: string; // ISO 4217-ish code, e.g. "KES", "USD"
  savingsGoal: number;
  /** Opening balance for the debt account; ledger transactions apply on top of this. */
  startingDebt: number;
}

export interface AppSettings {
  locale: "en" | "ar";
  money: MoneySettings;
  /** Default duration target (minutes) offered to new duration-type habits / the Focus timer. */
  focusTargetMinutes: number;
  meditationDefaultMinutes: number;
}

export interface RunningTimerState {
  kind: "focus" | "meditation";
  startedAt: string; // ISO timestamp — elapsed is always derived from this, never from setInterval ticks
  accumulatedSeconds: number; // seconds already committed before this run segment
  dateKey: string; // local calendar day this session is attributed to
  targetSeconds?: number; // meditation countdown target
}

export interface TrackerState {
  version: 6;
  passwordHash: string;
  dayOneDate: string; // YYYY-MM-DD
  habitsByPillar: Record<PillarId, Habit[]>;
  days: Record<string, DayRecord>;
  commitments: Commitment[];
  money: {
    transactions: MoneyTransaction[];
  };
  settings: AppSettings;
  timer: RunningTimerState | null;
}

export const STORAGE_KEY = "yawm-wahid:state:v6";
export const STORAGE_KEY_LEGACY_V5 = "yawm-wahid:state:v5";
export const STORAGE_KEY_LEGACY_V4 = "yawm-wahid:state:v4";
export const SAFETY_BACKUP_KEY = "yawm-wahid:safety-backup:v6";
export const APP_NAME = "Yawm Wahid";
export const SCHEMA_VERSION = 6;

export const STREAK_THRESHOLD = 70;

export function emptyDayRecord(): DayRecord {
  return { habits: {}, journal: "" };
}
