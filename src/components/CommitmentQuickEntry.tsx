"use client";

import { useId, useState } from "react";
import { PILLARS_META } from "@/domain/habits";
import { useTracker } from "@/providers/TrackerProvider";
import { PillarId } from "@/persistence/types";

const DEFAULT_TEXT = "I will ";

export function CommitmentQuickEntry() {
  const { addCommitment, today } = useTracker();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [expanded, setExpanded] = useState(false);
  const [targetDate, setTargetDate] = useState(today);
  const [targetTime, setTargetTime] = useState("");
  const [pillarId, setPillarId] = useState<PillarId | "">("");
  const [note, setNote] = useState("");
  const headingId = useId();
  const [announced, setAnnounced] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed.toLowerCase() === "i will") return;
    addCommitment({
      text: trimmed,
      targetDate: expanded && targetDate ? targetDate : undefined,
      targetTime: expanded && targetTime ? targetTime : undefined,
      pillarId: expanded && pillarId ? pillarId : undefined,
      note: expanded && note.trim() ? note : undefined,
    });
    setText(DEFAULT_TEXT);
    setTargetTime("");
    setNote("");
    setPillarId("");
    setExpanded(false);
    setAnnounced(`Promise made: ${trimmed}`);
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-white/10 bg-panel p-5">
      <h2 id={headingId} className="font-display text-lg text-parchment">
        Promises kept
      </h2>
      <p className="mt-1 text-xs text-slate">
        Say what you&apos;ll do. Keep it, and it&apos;s a point — never a judgment.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <label htmlFor="commitment-text" className="sr-only">
          What will you do?
        </label>
        <input
          id="commitment-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => {
            if (e.target.value === DEFAULT_TEXT) {
              requestAnimationFrame(() => e.target.setSelectionRange(text.length, text.length));
            }
          }}
          placeholder="What will you do?"
          className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-3 text-base text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="commitment-details"
          className="text-xs text-slate underline decoration-slate/40 underline-offset-2 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
        >
          {expanded ? "Hide details" : "Add a date, time, or pillar (optional)"}
        </button>

        {expanded && (
          <div id="commitment-details" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label htmlFor="commitment-date" className="mb-1 block text-xs text-slate">
                Date
              </label>
              <input
                id="commitment-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="commitment-time" className="mb-1 block text-xs text-slate">
                Time
              </label>
              <input
                id="commitment-time"
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="commitment-pillar" className="mb-1 block text-xs text-slate">
                Pillar
              </label>
              <select
                id="commitment-pillar"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value as PillarId | "")}
                className="w-full rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <option value="">None</option>
                {PILLARS_META.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="commitment-note" className="mb-1 block text-xs text-slate">
                Note
              </label>
              <input
                id="commitment-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="min-h-11 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Make the promise
        </button>
      </form>
      <p role="status" aria-live="polite" className="sr-only">
        {announced}
      </p>
    </section>
  );
}
