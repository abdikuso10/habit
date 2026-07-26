import { HabitDef, PillarId } from "./habits";

export interface DayRecord {
  habits: Record<string, boolean>;
  journal: string;
  deepWorkSeconds?: number;
}

export const SAVINGS_GOAL = 1_000_000;
export const STARTING_DEBT = 98000;
export const DEEP_WORK_TARGET_SECONDS = 4 * 60 * 60;

export interface TrackerState {
  version: 4;
  passwordHash: string;
  dayOneDate: string; // YYYY-MM-DD
  savingsTotal: number; // shillings saved, entered manually toward SAVINGS_GOAL
  debtRemaining: number; // shillings still owed, starts at STARTING_DEBT
  habitsByPillar: Record<PillarId, HabitDef[]>;
  days: Record<string, DayRecord>; // key: YYYY-MM-DD
}

export const STORAGE_KEY = "yawm-wahid:state:v4";
