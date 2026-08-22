"use client";

import { Award, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { commitmentsKeptInWeekOf, commitmentsKeptOn, filterCommitments, promisePoints } from "@/domain/commitments";
import { PILLARS_META } from "@/domain/habits";
import { Commitment, CommitmentStatus, PillarId } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";

const STATUS_LABELS: Record<CommitmentStatus, string> = {
  pending: "Pending",
  kept: "Kept",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

const EMPTY_COMMITMENTS: Commitment[] = [];

export function PromiseHistory() {
  const { state, today, undoKeptCommitment, deleteCommitment } = useTracker();
  const [statusFilter, setStatusFilter] = useState<CommitmentStatus | "all">("all");
  const [pillarFilter, setPillarFilter] = useState<PillarId | "all">("all");
  const [expanded, setExpanded] = useState(false);

  const commitments = state?.commitments ?? EMPTY_COMMITMENTS;

  const points = promisePoints(commitments);
  const keptToday = commitmentsKeptOn(commitments, today).length;
  const keptThisWeek = commitmentsKeptInWeekOf(commitments, today).length;

  const filtered = useMemo(
    () =>
      filterCommitments(commitments, {
        status: statusFilter === "all" ? undefined : statusFilter,
        pillarId: pillarFilter === "all" ? undefined : pillarFilter,
      }).sort((a, b) => (b.keptAt ?? b.createdAt).localeCompare(a.keptAt ?? a.createdAt)),
    [commitments, statusFilter, pillarFilter]
  );

  if (!state) return null;

  return (
    <section aria-label="Promise history" className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-gold" aria-hidden="true" />
          <h2 className="font-display text-lg text-parchment">Promise points</h2>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="promise-history-body"
          className="text-xs text-slate underline decoration-slate/40 underline-offset-2 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
        >
          {expanded ? "Hide history" : "View history"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-white/10 py-2">
          <p className="font-numeric text-xl text-gold">{points}</p>
          <p className="text-[11px] text-slate">Lifetime points</p>
        </div>
        <div className="rounded-lg border border-white/10 py-2">
          <p className="font-numeric text-xl text-parchment">{keptToday}</p>
          <p className="text-[11px] text-slate">Kept today</p>
        </div>
        <div className="rounded-lg border border-white/10 py-2">
          <p className="font-numeric text-xl text-parchment">{keptThisWeek}</p>
          <p className="text-[11px] text-slate">Kept this week</p>
        </div>
      </div>

      {expanded && (
        <div id="promise-history-body" className="mt-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="promise-status-filter">
              Filter by status
            </label>
            <select
              id="promise-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CommitmentStatus | "all")}
              className="rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-xs text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_LABELS) as CommitmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="promise-pillar-filter">
              Filter by pillar
            </label>
            <select
              id="promise-pillar-filter"
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value as PillarId | "all")}
              className="rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-xs text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <option value="all">All pillars</option>
              {PILLARS_META.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-slate">No promises match these filters yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {filtered.map((c) => (
                <HistoryRow key={c.id} commitment={c} onUndo={() => undoKeptCommitment(c.id)} onDelete={() => deleteCommitment(c.id)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function HistoryRow({
  commitment,
  onUndo,
  onDelete,
}: {
  commitment: Commitment;
  onUndo: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pillar = PILLARS_META.find((p) => p.id === commitment.pillarId);
  const timestamp =
    commitment.keptAt ?? commitment.cancelledAt ?? commitment.rescheduledAt ?? commitment.createdAt;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-night/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-parchment">{commitment.text}</p>
        <p className="text-[11px] text-slate">
          {STATUS_LABELS[commitment.status]} · {new Date(timestamp).toLocaleString()}
          {pillar ? ` · ${pillar.title}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {commitment.status === "kept" && (
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Undo2 size={12} aria-hidden="true" />
            Undo
          </button>
        )}
        {confirmingDelete ? (
          <>
            <span className="text-[11px] text-slate">Remove?</span>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md border border-clay/50 px-2 py-1 text-[11px] text-clay hover:bg-clay/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              No
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Remove ${commitment.text} from history`}
            className="rounded-md border border-white/10 p-1.5 text-slate/60 transition hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}
