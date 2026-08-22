// Promises Kept / My Word. The point total is NEVER a stored counter — it is
// always derived from commitment status so it can't drift from history and
// can't be double-counted or driven negative. See promisePoints() below.

import { daysBetween, startOfWeek } from "./date";
import { Commitment, CommitmentStatus, PillarId } from "@/persistence/types";

export function generateCommitmentId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `promise-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface CreateCommitmentInput {
  text: string;
  targetDate?: string;
  targetTime?: string;
  pillarId?: PillarId;
  note?: string;
}

export function createCommitment(input: CreateCommitmentInput, nowIso: string): Commitment {
  return {
    id: generateCommitmentId(),
    text: input.text.trim(),
    createdAt: nowIso,
    targetDate: input.targetDate,
    targetTime: input.targetTime,
    pillarId: input.pillarId,
    note: input.note?.trim() || undefined,
    status: "pending",
  };
}

/** Marks a commitment kept. Idempotent by construction: calling this on an
 * already-kept commitment returns it unchanged, so a duplicate click (or a
 * retried event) can never award a second point for the same commitment. */
export function markKept(commitment: Commitment, nowIso: string): Commitment {
  if (commitment.status === "kept") return commitment;
  return { ...commitment, status: "kept", keptAt: nowIso };
}

/** Undo: only meaningful from "kept". Returns the commitment unchanged from
 * any other state so undo can't be used to manufacture a status change. */
export function undoKept(commitment: Commitment): Commitment {
  if (commitment.status !== "kept") return commitment;
  const { keptAt: _keptAt, ...rest } = commitment;
  void _keptAt;
  return { ...rest, status: "pending" };
}

export function cancelCommitment(commitment: Commitment, nowIso: string): Commitment {
  if (commitment.status === "kept" || commitment.status === "cancelled") return commitment;
  return { ...commitment, status: "cancelled", cancelledAt: nowIso };
}

/** Rescheduling never mutates or removes any other commitment's status, so it
 * can never take away an unrelated point. It closes the original as
 * "rescheduled" and opens a fresh pending commitment linked back to it. */
export function rescheduleCommitment(
  commitment: Commitment,
  nowIso: string,
  next: { targetDate?: string; targetTime?: string }
): { updated: Commitment; created: Commitment } {
  const updated: Commitment = {
    ...commitment,
    status: "rescheduled",
    rescheduledAt: nowIso,
  };
  const created: Commitment = {
    id: generateCommitmentId(),
    text: commitment.text,
    createdAt: nowIso,
    targetDate: next.targetDate,
    targetTime: next.targetTime,
    pillarId: commitment.pillarId,
    note: commitment.note,
    status: "pending",
    rescheduledFromId: commitment.id,
  };
  return { updated, created };
}

/** The single source of truth for the point total. Never store this. */
export function promisePoints(commitments: Commitment[]): number {
  return commitments.filter((c) => c.status === "kept").length;
}

export function commitmentsByStatus(
  commitments: Commitment[],
  status: CommitmentStatus
): Commitment[] {
  return commitments.filter((c) => c.status === status);
}

function keptOnDateKey(c: Commitment): string | null {
  if (c.status !== "kept" || !c.keptAt) return null;
  // keptAt is an ISO timestamp; take its local calendar date.
  const d = new Date(c.keptAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function commitmentsKeptOn(commitments: Commitment[], dateKey: string): Commitment[] {
  return commitments.filter((c) => keptOnDateKey(c) === dateKey);
}

export function commitmentsKeptInWeekOf(
  commitments: Commitment[],
  dateKey: string
): Commitment[] {
  const start = startOfWeek(dateKey);
  return commitments.filter((c) => {
    const kept = keptOnDateKey(c);
    if (!kept) return false;
    const offset = daysBetween(start, kept);
    return offset >= 0 && offset < 7;
  });
}

export interface CommitmentFilter {
  status?: CommitmentStatus;
  pillarId?: PillarId;
  fromDate?: string;
  toDate?: string;
}

export function filterCommitments(
  commitments: Commitment[],
  filter: CommitmentFilter
): Commitment[] {
  return commitments.filter((c) => {
    if (filter.status && c.status !== filter.status) return false;
    if (filter.pillarId && c.pillarId !== filter.pillarId) return false;
    const anchorDate = c.targetDate ?? c.createdAt.slice(0, 10);
    if (filter.fromDate && anchorDate < filter.fromDate) return false;
    if (filter.toDate && anchorDate > filter.toDate) return false;
    return true;
  });
}
