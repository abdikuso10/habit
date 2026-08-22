import { describe, expect, it } from "vitest";
import {
  cancelCommitment,
  createCommitment,
  markKept,
  promisePoints,
  rescheduleCommitment,
  undoKept,
} from "./commitments";

const NOW = "2026-01-05T10:00:00.000Z";

describe("Promises Kept / My Word", () => {
  it("creates a pending commitment from free text", () => {
    const c = createCommitment({ text: "I will read for 20 minutes" }, NOW);
    expect(c.status).toBe("pending");
    expect(c.text).toBe("I will read for 20 minutes");
    expect(c.id).toBeTruthy();
  });

  it("marking kept sets status and keptAt, and awards exactly one point", () => {
    const pending = createCommitment({ text: "I will call my mother" }, NOW);
    const kept = markKept(pending, "2026-01-05T12:00:00.000Z");
    expect(kept.status).toBe("kept");
    expect(kept.keptAt).toBe("2026-01-05T12:00:00.000Z");
    expect(promisePoints([kept])).toBe(1);
  });

  it("marking an already-kept commitment kept again does not award a second point (idempotent)", () => {
    const pending = createCommitment({ text: "I will finish my assignment" }, NOW);
    const keptOnce = markKept(pending, "2026-01-05T12:00:00.000Z");
    const keptTwice = markKept(keptOnce, "2026-01-05T13:00:00.000Z"); // simulates a duplicate click
    expect(keptTwice).toEqual(keptOnce); // untouched, keptAt didn't change
    expect(promisePoints([keptTwice])).toBe(1);
  });

  it("undoing a kept commitment removes its point (points are always derived, never stored)", () => {
    const pending = createCommitment({ text: "I will clean my room" }, NOW);
    const kept = markKept(pending, "2026-01-05T12:00:00.000Z");
    expect(promisePoints([kept])).toBe(1);
    const undone = undoKept(kept);
    expect(undone.status).toBe("pending");
    expect(undone.keptAt).toBeUndefined();
    expect(promisePoints([undone])).toBe(0);
  });

  it("undo on a non-kept commitment is a no-op", () => {
    const pending = createCommitment({ text: "I will meditate" }, NOW);
    expect(undoKept(pending)).toEqual(pending);
  });

  it("the point total is always the count of kept commitments, never negative", () => {
    const list = [
      markKept(createCommitment({ text: "A" }, NOW), NOW),
      createCommitment({ text: "B" }, NOW),
      cancelCommitment(createCommitment({ text: "C" }, NOW), NOW),
    ];
    expect(promisePoints(list)).toBe(1);
    expect(promisePoints([])).toBe(0);
  });

  it("cancelling a commitment never touches other commitments' points", () => {
    const keptA = markKept(createCommitment({ text: "A" }, NOW), NOW);
    const pendingB = createCommitment({ text: "B" }, NOW);
    const cancelledB = cancelCommitment(pendingB, NOW);
    expect(promisePoints([keptA, cancelledB])).toBe(1);
  });

  it("rescheduling closes the original and opens a new pending commitment, without granting a point", () => {
    const original = createCommitment({ text: "I will go to the gym", targetDate: "2026-01-05" }, NOW);
    const { updated, created } = rescheduleCommitment(original, "2026-01-05T09:00:00.000Z", {
      targetDate: "2026-01-06",
    });
    expect(updated.status).toBe("rescheduled");
    expect(created.status).toBe("pending");
    expect(created.rescheduledFromId).toBe(original.id);
    expect(created.targetDate).toBe("2026-01-06");
    expect(promisePoints([updated, created])).toBe(0);
  });

  it("rescheduling an already-kept commitment does not create a negative point anywhere", () => {
    const kept = markKept(createCommitment({ text: "A" }, NOW), NOW);
    // Rescheduling is only offered on pending commitments in the UI, but the
    // domain function itself must still never produce a negative total.
    const { updated, created } = rescheduleCommitment(kept, NOW, { targetDate: "2026-01-06" });
    expect(promisePoints([updated, created])).toBeGreaterThanOrEqual(0);
  });
});
