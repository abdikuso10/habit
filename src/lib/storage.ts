import { STORAGE_KEY, TrackerState } from "./types";

export function loadState(): TrackerState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!isTrackerState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: TrackerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isTrackerState(value: unknown): value is TrackerState {
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

export function exportBackup(state: TrackerState): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yawm-wahid-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export class BackupImportError extends Error {}

export function parseBackupFile(text: string): TrackerState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupImportError("That file isn't valid JSON.");
  }
  if (!isTrackerState(parsed)) {
    throw new BackupImportError(
      "That file doesn't look like a Yawm Wahid backup."
    );
  }
  return parsed;
}
