import { migrateV4ToV5 } from "./migrations/v4-to-v5";
import { migrateV5ToV6 } from "./migrations/v5-to-v6";
import { isLegacyTrackerStateV4 } from "./legacyV4";
import { APP_NAME, SCHEMA_VERSION, TrackerState } from "./types";
import { BackupSummary, isTrackerStateV5, isTrackerStateV6, summarizeBackup } from "./validate";

export interface ExportPayload {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  state: TrackerState;
}

export function buildExportPayload(state: TrackerState, nowIso: string): ExportPayload {
  return { app: APP_NAME, schemaVersion: SCHEMA_VERSION, exportedAt: nowIso, state };
}

export function exportBackupToFile(state: TrackerState, nowIso: string): void {
  const payload = buildExportPayload(state, nowIso);
  const dateStamp = nowIso.slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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

export type ImportPreview =
  | { ok: true; state: TrackerState; summary: BackupSummary; migratedFrom: 4 | 5 | null }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** Parses and fully validates a backup file's text WITHOUT touching current
 * state. Accepts both the wrapped export format (with app/schemaVersion/
 * exportedAt metadata) and a bare v6, v5 or legacy v4 state object, since
 * older exports and hand-edited files may be bare. Older backups are
 * migrated forward in memory and re-validated before they are ever offered
 * as something to import. */
export function previewImport(text: string): ImportPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "That file doesn't look like a Yawm Wahid backup." };
  }

  const candidate = isRecord(parsed.state) && typeof parsed.schemaVersion === "number" ? parsed.state : parsed;
  const exportedAt = isRecord(parsed.state) && typeof parsed.exportedAt === "string" ? parsed.exportedAt : undefined;
  const appName = isRecord(parsed.state) && typeof parsed.app === "string" ? parsed.app : undefined;

  if (isTrackerStateV6(candidate)) {
    return { ok: true, state: candidate, summary: summarizeBackup(candidate, { exportedAt, appName }), migratedFrom: null };
  }

  if (isTrackerStateV5(candidate)) {
    const migrated = migrateV5ToV6(candidate);
    if (!isTrackerStateV6(migrated)) {
      return { ok: false, error: "That v5 backup migrated to an invalid state. Nothing was changed." };
    }
    return { ok: true, state: migrated, summary: summarizeBackup(migrated, { exportedAt, appName }), migratedFrom: 5 };
  }

  if (isLegacyTrackerStateV4(candidate)) {
    const migrated = migrateV5ToV6(migrateV4ToV5(candidate));
    if (!isTrackerStateV6(migrated)) {
      return { ok: false, error: "That v4 backup migrated to an invalid state. Nothing was changed." };
    }
    return { ok: true, state: migrated, summary: summarizeBackup(migrated, { exportedAt, appName }), migratedFrom: 4 };
  }

  return { ok: false, error: "That file doesn't look like a Yawm Wahid backup." };
}
