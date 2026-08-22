// The only module allowed to touch window.localStorage directly.
//
// UNUSED as of the move to Postgres — the app now reads and writes through
// `remote.ts` and the /api/state route. This is kept rather than deleted
// because it is the only code that can still read a vault left behind in a
// browser's localStorage, including the v4 and v5 keys and their migrations.
// Anyone upgrading from a pre-database version has data sitting there, and the
// one-time import that moves it into Postgres will need exactly this. Delete it
// once that migration has run, or once you are certain no such vault exists.

import { isLegacyTrackerStateV4 } from "./legacyV4";
import { migrateV4ToV5 } from "./migrations/v4-to-v5";
import { migrateV5ToV6 } from "./migrations/v5-to-v6";
import {
  SAFETY_BACKUP_KEY,
  STORAGE_KEY,
  STORAGE_KEY_LEGACY_V4,
  STORAGE_KEY_LEGACY_V5,
  TrackerState,
} from "./types";
import { isTrackerStateV5, isTrackerStateV6 } from "./validate";

export type LoadResult =
  | { status: "empty" }
  | { status: "ok"; state: TrackerState; migratedFrom: 4 | 5 | null }
  | { status: "corrupted"; rawPreservedUnderKey: string };

const CORRUPTED_KEY_PREFIX = "yawm-wahid:corrupted:";

function safeParse(raw: string): unknown | typeof PARSE_ERROR {
  try {
    return JSON.parse(raw);
  } catch {
    return PARSE_ERROR;
  }
}
const PARSE_ERROR = Symbol("parse-error");

/** Reads current state, migrating v4 -> v5 -> v6 or recovering from
 * corruption as needed. Never deletes data it can't parse — it's preserved
 * under a timestamped key so nothing is silently lost, and a legacy key is
 * left in place after migration rather than removed. */
export function loadState(): LoadResult {
  if (typeof window === "undefined") return { status: "empty" };

  const rawV6 = window.localStorage.getItem(STORAGE_KEY);
  if (rawV6) {
    const parsed = safeParse(rawV6);
    if (parsed !== PARSE_ERROR && isTrackerStateV6(parsed)) {
      return { status: "ok", state: parsed, migratedFrom: null };
    }
    // The current key exists but is unreadable — try the safety backup
    // before giving up on it.
    const recovered = tryRecoverFromSafetyBackup();
    if (recovered) return { status: "ok", state: recovered, migratedFrom: null };
    const preservedKey = preserveCorrupted(rawV6);
    return { status: "corrupted", rawPreservedUnderKey: preservedKey };
  }

  const rawV5 = window.localStorage.getItem(STORAGE_KEY_LEGACY_V5);
  if (rawV5) {
    const parsed = safeParse(rawV5);
    if (parsed !== PARSE_ERROR && isTrackerStateV5(parsed)) {
      const migrated = migrateV5ToV6(parsed);
      writeState(migrated);
      return { status: "ok", state: migrated, migratedFrom: 5 };
    }
    const preservedKey = preserveCorrupted(rawV5);
    return { status: "corrupted", rawPreservedUnderKey: preservedKey };
  }

  const rawV4 = window.localStorage.getItem(STORAGE_KEY_LEGACY_V4);
  if (rawV4) {
    const parsed = safeParse(rawV4);
    if (parsed !== PARSE_ERROR && isLegacyTrackerStateV4(parsed)) {
      const migrated = migrateV5ToV6(migrateV4ToV5(parsed));
      writeState(migrated);
      return { status: "ok", state: migrated, migratedFrom: 4 };
    }
    const preservedKey = preserveCorrupted(rawV4);
    return { status: "corrupted", rawPreservedUnderKey: preservedKey };
  }

  return { status: "empty" };
}

function tryRecoverFromSafetyBackup(): TrackerState | null {
  const raw = window.localStorage.getItem(SAFETY_BACKUP_KEY);
  if (!raw) return null;
  const parsed = safeParse(raw);
  if (parsed === PARSE_ERROR || !isTrackerStateV6(parsed)) return null;
  return parsed;
}

function preserveCorrupted(raw: string): string {
  const key = `${CORRUPTED_KEY_PREFIX}${Date.now()}`;
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Storage may be full; nothing more we can safely do.
  }
  return key;
}

/** Serialize-then-write: a JSON.stringify failure (e.g. a circular ref bug)
 * throws before anything touches storage, so a bad in-memory state can never
 * partially overwrite a good persisted one. */
export function writeState(state: TrackerState): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(state);
  window.localStorage.setItem(STORAGE_KEY, serialized);
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(STORAGE_KEY_LEGACY_V5);
  window.localStorage.removeItem(STORAGE_KEY_LEGACY_V4);
}

/** Snapshot the current state before a risky operation (import). */
export function writeSafetyBackup(): void {
  if (typeof window === "undefined") return;
  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current) window.localStorage.setItem(SAFETY_BACKUP_KEY, current);
}

export function clearSafetyBackup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAFETY_BACKUP_KEY);
}

export function restoreSafetyBackup(): boolean {
  if (typeof window === "undefined") return false;
  const backup = window.localStorage.getItem(SAFETY_BACKUP_KEY);
  if (!backup) return false;
  window.localStorage.setItem(STORAGE_KEY, backup);
  return true;
}

/** Write, then read back and validate — used for imports, where correctness
 * matters more than the extra read. Restores the pre-import safety backup on
 * any verification failure, so a bad import can never leave half-applied
 * state behind. */
export function commitStateVerified(state: TrackerState): { ok: true } | { ok: false; error: string } {
  writeSafetyBackup();
  try {
    writeState(state);
    const readBack = window.localStorage.getItem(STORAGE_KEY);
    const parsed = readBack ? safeParse(readBack) : PARSE_ERROR;
    if (parsed === PARSE_ERROR || !isTrackerStateV6(parsed)) {
      restoreSafetyBackup();
      return { ok: false, error: "The imported data failed verification after writing. Your previous data was restored." };
    }
    clearSafetyBackup();
    return { ok: true };
  } catch {
    restoreSafetyBackup();
    return { ok: false, error: "Couldn't write the imported data (storage may be full). Your previous data was restored." };
  }
}

/** Cross-tab sync: fires when another tab/window changes the current key. */
export function subscribeToExternalChanges(onChange: (state: TrackerState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    const parsed = safeParse(event.newValue);
    if (parsed !== PARSE_ERROR && isTrackerStateV6(parsed)) onChange(parsed);
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Debounced writer for high-frequency changes (journal keystrokes) so we
 * don't serialize the entire app state on every character. */
export function createDebouncedWriter(delayMs: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pending: TrackerState | null = null;

  function schedule(state: TrackerState, onFlushed?: () => void) {
    pending = state;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (pending) writeState(pending);
      pending = null;
      timeout = null;
      onFlushed?.();
    }, delayMs);
  }

  function flushNow() {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    if (pending) writeState(pending);
    pending = null;
  }

  function cancel() {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    pending = null;
  }

  return { schedule, flushNow, cancel };
}
