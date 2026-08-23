"use client";

import { useSyncExternalStore } from "react";
import { Dialog } from "./Dialog";
import { useTracker } from "@/providers/TrackerProvider";

/*
  The morning-after report, shown once per day before anything else.

  Dismissal is remembered in localStorage rather than in the vault. It is not
  data — it is "this device has already shown today's dialog" — and the cost of
  losing it is seeing one dialog twice, which is not worth a schema version and
  a v6->v7 migration across a document the app must never corrupt. It does mean
  a second device shows the report again the same morning; that is the right
  trade for a message meant to be read once on whatever you actually opened.
*/
const SEEN_KEY = "yawm-wahid:day-review-seen";

/*
  localStorage is external mutable state, so it is read through
  useSyncExternalStore rather than an effect. That is what the hook exists for:
  the server snapshot is null, so the dialog never renders server-side and the
  client's first paint agrees with it, which an effect-plus-setState would only
  achieve by flashing.

  Every access is guarded. Private windows, cleared site data and browsers set
  to block storage make these throw rather than return null, and a dialog about
  yesterday is never worth taking the app down over.
*/
const listeners = new Set<() => void>();

function subscribeSeen(onChange: () => void): () => void {
  listeners.add(onChange);
  // `storage` only fires in *other* tabs, so dismissing in one tab closes the
  // dialog in the rest; the local set covers this tab.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Returns the stored date string, which React compares by value — so a
 * repeated read of the same day is a stable snapshot, not a new object. */
function seenSnapshot(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function seenServerSnapshot(): string | null {
  return null;
}

function markSeen(dateKey: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY, dateKey);
  } catch {
    // Nothing stored means the dialog shows again next time — an acceptable
    // failure, and better than blocking the dismissal.
  }
  for (const listener of listeners) listener();
}

const BAR_BG = "rgba(255, 255, 255, 0.08)";

/** One sector's line: name, count, and a bar that carries the same figure
 * visually for people who read shape faster than numbers. */
function SectorRow({
  title,
  completed,
  scheduled,
  pct,
  weakest,
}: {
  title: string;
  completed: number;
  scheduled: number;
  pct: number;
  weakest: boolean;
}) {
  // A sector that asked nothing is reported as such rather than as a perfect
  // score it did not earn.
  const askedNothing = scheduled === 0;

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-sm ${weakest ? "text-parchment" : "text-slate"}`}>
          {title}
          {weakest && <span className="ml-2 text-xs text-faint">weakest</span>}
        </span>
        <span className="font-mono text-xs text-slate tabular-nums">
          {askedNothing ? "nothing asked" : `${completed}/${scheduled}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: BAR_BG }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${askedNothing ? 0 : pct}%`,
            background: weakest ? "var(--color-clay)" : "var(--color-green)",
          }}
        />
      </div>
    </li>
  );
}

export function DayReviewDialog() {
  const { dayReview } = useTracker();
  const seen = useSyncExternalStore(subscribeSeen, seenSnapshot, seenServerSnapshot);

  if (!dayReview) return null;

  // Derived, not stored: dismissing writes the date, which notifies the store
  // and closes this on the next render. One source of truth, no local copy to
  // drift from it.
  const open = seen !== dayReview.dateKey;
  const close = () => markSeen(dayReview.dateKey);

  return (
    <Dialog open={open} onClose={close} title="Yesterday">
      <div className="space-y-5">
        <div>
          <h3 className="font-display text-xl text-parchment">{dayReview.headline}</h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate">{dayReview.body}</p>
        </div>

        <ul className="space-y-3">
          {dayReview.sectors.map((sector) => (
            <SectorRow
              key={sector.id}
              title={sector.title}
              completed={sector.completed}
              scheduled={sector.scheduled}
              pct={sector.pct}
              weakest={sector.id === dayReview.weakest?.id}
            />
          ))}
        </ul>

        <button
          type="button"
          onClick={close}
          className="min-h-11 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Got it
        </button>
      </div>
    </Dialog>
  );
}
