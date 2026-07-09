"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { BackupImportError, useTracker } from "@/lib/TrackerContext";

export function BackupTools() {
  const { exportBackup, importBackup } = useTracker();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setImported(false);
    try {
      const text = await file.text();
      importBackup(text);
      setImported(true);
    } catch (err) {
      if (err instanceof BackupImportError) {
        setError(err.message);
      } else {
        setError("Something went wrong reading that file.");
      }
    }
  }

  return (
    <section
      aria-label="Backup"
      className="rounded-2xl border border-white/10 bg-panel p-5"
    >
      <h2 className="font-display text-lg text-parchment">Backup</h2>
      <p className="mt-1 text-xs text-slate">
        Everything lives on this device only. Export a copy now and then.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportBackup}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm text-parchment transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Download size={15} aria-hidden="true" />
          Export backup
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm text-parchment transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Upload size={15} aria-hidden="true" />
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>

      {imported && (
        <p className="mt-3 text-xs text-green">Backup restored.</p>
      )}
      {error && (
        <p className="mt-3 text-xs text-clay" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
