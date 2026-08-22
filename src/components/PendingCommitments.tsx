"use client";

import { Check, Clock, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { PILLARS_META } from "@/domain/habits";
import { Commitment } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";

function sortPending(list: Commitment[]): Commitment[] {
  return list.slice().sort((a, b) => {
    const aKey = a.targetDate ?? "9999-99-99";
    const bKey = b.targetDate ?? "9999-99-99";
    if (aKey !== bKey) return aKey.localeCompare(bKey);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function PendingCommitments() {
  const { state } = useTracker();
  if (!state) return null;
  const pending = sortPending(state.commitments.filter((c) => c.status === "pending"));

  return (
    <section aria-label="Pending promises" className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg text-parchment">Pending promises</h2>
        <span className="font-numeric text-sm text-slate">{pending.length}</span>
      </div>

      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-slate">
          Nothing pending. Whenever you say you&apos;ll do something, it lands here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((c) => (
            <PendingRow key={c.id} commitment={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PendingRow({ commitment }: { commitment: Commitment }) {
  const { keepCommitment, cancelCommitment, rescheduleCommitment } = useTracker();
  const [rescheduling, setRescheduling] = useState(false);
  const [nextDate, setNextDate] = useState(commitment.targetDate ?? "");
  const [nextTime, setNextTime] = useState(commitment.targetTime ?? "");
  const pillar = PILLARS_META.find((p) => p.id === commitment.pillarId);

  function submitReschedule(e: React.FormEvent) {
    e.preventDefault();
    rescheduleCommitment(commitment.id, {
      targetDate: nextDate || undefined,
      targetTime: nextTime || undefined,
    });
    setRescheduling(false);
  }

  return (
    <li className="rounded-xl border border-white/10 bg-night/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-parchment">{commitment.text}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate">
            {commitment.targetDate && (
              <span className="flex items-center gap-1">
                <Clock size={11} aria-hidden="true" />
                {commitment.targetDate}
                {commitment.targetTime ? ` · ${commitment.targetTime}` : ""}
              </span>
            )}
            {pillar && (
              <span className="rounded-full border border-white/10 px-2 py-0.5 font-arabic text-gold">
                {pillar.arabic}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => keepCommitment(commitment.id)}
            className="flex items-center gap-1 rounded-lg border border-green/40 bg-green/10 px-2.5 py-1.5 text-xs font-medium text-green transition hover:bg-green/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Check size={13} strokeWidth={3} aria-hidden="true" />
            Kept it
          </button>
          <button
            type="button"
            onClick={() => setRescheduling((v) => !v)}
            aria-expanded={rescheduling}
            aria-label={`Reschedule: ${commitment.text}`}
            className="rounded-lg border border-white/10 p-1.5 text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => cancelCommitment(commitment.id)}
            aria-label={`Cancel: ${commitment.text}`}
            className="rounded-lg border border-white/10 p-1.5 text-slate transition hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {rescheduling && (
        <form onSubmit={submitReschedule} className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
          <div>
            <label htmlFor={`reschedule-date-${commitment.id}`} className="mb-1 block text-xs text-slate">
              New date
            </label>
            <input
              id={`reschedule-date-${commitment.id}`}
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor={`reschedule-time-${commitment.id}`} className="mb-1 block text-xs text-slate">
              New time
            </label>
            <input
              id={`reschedule-time-${commitment.id}`}
              type="time"
              value={nextTime}
              onChange={(e) => setNextTime(e.target.value)}
              className="rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Reschedule
          </button>
        </form>
      )}
    </li>
  );
}
