"use client";

import { useTracker } from "@/lib/TrackerContext";

export function Journal() {
  const { today, getDayRecord, setJournal } = useTracker();
  const day = getDayRecord(today);

  return (
    <section
      aria-label="Journal"
      className="rounded-2xl border border-white/10 bg-panel p-5"
    >
      <h2 className="font-display text-lg text-parchment">Journal</h2>
      <textarea
        value={day.journal}
        onChange={(e) => setJournal(today, e.target.value)}
        placeholder="What did I resist today? What do I owe tomorrow?"
        rows={4}
        className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </section>
  );
}
