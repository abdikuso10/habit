import { HabitDef, PillarId } from "./habits";

export interface DayRecord {
  habits: Record<string, boolean>;
  journal: string;
}

export const SAVINGS_GOAL = 1_000_000;

export interface TrackerState {
  version: 3;
  passwordHash: string;
  dayOneDate: string; // YYYY-MM-DD
  savingsTotal: number; // shillings saved, entered manually toward SAVINGS_GOAL
  habitsByPillar: Record<PillarId, HabitDef[]>;
  days: Record<string, DayRecord>; // key: YYYY-MM-DD
}

export const STORAGE_KEY = "yawm-wahid:state:v3";
