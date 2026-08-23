"use client";

import { useRef, useState } from "react";
import { useTracker } from "@/providers/TrackerProvider";

export function CorruptedDataScreen({ preservedKey }: { preservedKey: string | null }) {
  const { previewImportFile, confirmImport } = useTracker();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    const text = await file.text();
    const result = previewImportFile(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const commit = await confirmImport(result.state);
    if (!commit.ok) setError(commit.error ?? "Restore failed.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-clay/40 bg-panel p-6 sm:p-8">
        <h1 className="font-display text-2xl text-parchment">Your data couldn&apos;t be read</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          The stored data didn&apos;t pass validation, so the app won&apos;t use it rather than risk showing you
          something wrong. Nothing has been deleted or overwritten — the original row is still in the database
          {preservedKey ? (
            <>
              {" "}
              (preserved as <code className="rounded bg-night px-1.5 py-0.5 text-xs text-gold">{preservedKey}</code>)
            </>
          ) : null}
          {" "}and can be inspected directly.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          If you have an exported backup file, restore it here to get going again immediately.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 min-h-11 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Restore from backup
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="sr-only" />

        {error && (
          <p className="mt-3 text-sm text-clay" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
