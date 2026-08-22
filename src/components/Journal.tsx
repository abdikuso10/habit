"use client";

import { ChevronLeft, ChevronRight, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, formatFullDate } from "@/domain/date";
import { useTracker } from "@/providers/TrackerProvider";

const PROMPTS = [
  "What did I resist today?",
  "What do I owe tomorrow?",
  "What went better than expected?",
  "Where did I keep my word?",
  "What's one thing I'm grateful for right now?",
];

function hashStringToIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash % modulo;
}

export function Journal() {
  const { state, today, getDayRecord, setJournal, toggleJournalFavorite, journalSaveStatus } = useTracker();
  const [journalDate, setJournalDate] = useState(today);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const day = getDayRecord(journalDate);
  // Deterministic (not random) so the same date always shows the same
  // prompt on re-render, and rotates day to day.
  const promptIndex = useMemo(() => hashStringToIndex(journalDate, PROMPTS.length), [journalDate]);

  const results = useMemo(() => {
    if (!state || search.trim().length < 2) return [];
    const q = search.trim().toLowerCase();
    return Object.entries(state.days)
      .filter(([, d]) => d.journal && d.journal.toLowerCase().includes(q))
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 20);
  }, [state, search]);

  const isViewingToday = journalDate === today;

  return (
    <section aria-label="Journal" className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-parchment">Journal</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            aria-expanded={showSearch}
            aria-label="Search journal"
            className="rounded-md p-1.5 text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Search size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setJournalDate((d) => addDays(d, -1))}
            aria-label="Previous day"
            className="rounded-md p-1.5 text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <input
            type="date"
            value={journalDate}
            onChange={(e) => setJournalDate(e.target.value)}
            max={today}
            aria-label="Journal entry date"
            className="rounded-md border border-white/10 bg-night px-2 py-1 text-xs text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={() => setJournalDate((d) => addDays(d, 1))}
            disabled={isViewingToday}
            aria-label="Next day"
            className="rounded-md p-1.5 text-slate hover:text-parchment disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="mt-3">
          <label htmlFor="journal-search" className="sr-only">
            Search journal entries
          </label>
          <input
            id="journal-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search past entries…"
            className="w-full rounded-lg border border-white/10 bg-night px-3.5 py-2 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          {results.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {results.map(([dateKey, d]) => (
                <li key={dateKey}>
                  <button
                    type="button"
                    onClick={() => {
                      setJournalDate(dateKey);
                      setShowSearch(false);
                    }}
                    className="block w-full truncate rounded-md px-2 py-1 text-left text-xs text-slate hover:bg-white/5 hover:text-parchment"
                  >
                    <span className="text-gold">{dateKey}</span> — {d.journal}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate">{formatFullDate(journalDate)}</p>

      <div className="relative mt-2">
        <label htmlFor="journal-entry" className="sr-only">
          Journal entry for {journalDate}
        </label>
        <textarea
          id="journal-entry"
          value={day.journal}
          onChange={(e) => setJournal(journalDate, e.target.value)}
          placeholder={PROMPTS[promptIndex]}
          rows={4}
          className="w-full resize-y rounded-lg border border-white/10 bg-night px-3.5 py-2.5 pr-9 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <button
          type="button"
          onClick={() => toggleJournalFavorite(journalDate)}
          aria-pressed={Boolean(day.journalFavorite)}
          aria-label={day.journalFavorite ? "Unfavorite this entry" : "Favorite this entry"}
          className="absolute right-2 top-2 rounded p-1 text-slate/60 transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Star size={16} fill={day.journalFavorite ? "var(--color-gold)" : "none"} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-1.5 text-[11px] text-slate" role="status" aria-live="polite">
        {isViewingToday && journalSaveStatus === "saving" && "Saving…"}
        {isViewingToday && journalSaveStatus === "saved" && "Saved"}
        {!isViewingToday && day.journalUpdatedAt && `Last saved ${new Date(day.journalUpdatedAt).toLocaleString()}`}
      </p>
    </section>
  );
}
