"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ImportPreview } from "@/persistence/importExport";
import { useTracker } from "@/providers/TrackerProvider";
import { Dialog } from "./Dialog";

export function BackupTools() {
  const { exportBackup, previewImportFile, confirmImport } = useTracker();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);
  const [preview, setPreview] = useState<Extract<ImportPreview, { ok: true }> | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setImported(false);
    const text = await file.text();
    const result = previewImportFile(text);
    if (result.ok) {
      setPreview(result);
    } else {
      setError(result.error);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    const result = await confirmImport(preview.state);
    setPreview(null);
    if (result.ok) {
      setImported(true);
    } else {
      setError(result.error ?? "Import failed. Your previous data was kept.");
    }
  }

  return (
    <section aria-label="Backup" className="rounded-2xl border border-white/10 bg-panel p-5">
      <h2 className="font-display text-lg text-parchment">Backup</h2>
      <p className="mt-1 text-xs text-slate">
        Your data lives in the database. Export a copy now and then so you hold one too. Imports are previewed and
        verified before anything is replaced, and the server validates them again before the old data is overwritten.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportBackup}
          className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm text-parchment transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Download size={15} aria-hidden="true" />
          Export backup
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm text-parchment transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Upload size={15} aria-hidden="true" />
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          aria-label="Import backup file"
          data-testid="backup-file-input"
          tabIndex={-1}
          className="sr-only"
        />
      </div>

      {imported && <p className="mt-3 text-xs text-green">Backup restored.</p>}
      {error && (
        <p className="mt-3 text-xs text-clay" role="alert">
          {error}
        </p>
      )}

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} title="Confirm import">
        {preview && (
          <div className="space-y-4">
            <p className="text-sm text-slate">
              This will replace your current data with the backup below. Your current data is kept as a safety copy
              until the import is verified.
              {preview.migratedFrom !== null &&
                ` This is a v${preview.migratedFrom} backup — it will be upgraded to the current format.`}
            </p>
            <dl className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-night p-3 text-xs">
              <div>
                <dt className="text-slate">Day one</dt>
                <dd className="font-numeric text-parchment">{preview.summary.dayOneDate}</dd>
              </div>
              <div>
                <dt className="text-slate">Days tracked</dt>
                <dd className="font-numeric text-parchment">{preview.summary.daysTracked}</dd>
              </div>
              <div>
                <dt className="text-slate">Habits</dt>
                <dd className="font-numeric text-parchment">{preview.summary.habitCount}</dd>
              </div>
              <div>
                <dt className="text-slate">Promise points</dt>
                <dd className="font-numeric text-parchment">{preview.summary.promisePoints}</dd>
              </div>
              <div>
                <dt className="text-slate">Transactions</dt>
                <dd className="font-numeric text-parchment">{preview.summary.transactionCount}</dd>
              </div>
              {preview.summary.exportedAt && (
                <div>
                  <dt className="text-slate">Exported</dt>
                  <dd className="text-parchment">{new Date(preview.summary.exportedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                className="min-h-11 flex-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Replace my data
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="min-h-11 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
