import { describe, expect, it } from "vitest";
import { elapsedSeconds, formatHms, formatMs } from "./timer";
import { RunningTimerState } from "@/persistence/types";

describe("timer elapsed calculation", () => {
  it("derives elapsed purely from timestamps, not tick counting", () => {
    const timer: RunningTimerState = {
      kind: "focus",
      startedAt: "2026-01-05T10:00:00.000Z",
      accumulatedSeconds: 30,
      dateKey: "2026-01-05",
    };
    const now = new Date("2026-01-05T10:01:00.000Z").getTime(); // 60s later
    expect(elapsedSeconds(timer, now)).toBe(90); // 30 accumulated + 60 elapsed
  });

  it("survives a simulated refresh: elapsed at time T is the same regardless of intermediate ticks", () => {
    const timer: RunningTimerState = {
      kind: "meditation",
      startedAt: "2026-01-05T10:00:00.000Z",
      accumulatedSeconds: 0,
      dateKey: "2026-01-05",
    };
    const laterMs = new Date("2026-01-05T10:05:00.000Z").getTime();
    // Whether or not any interval ticked in between, elapsed is deterministic.
    expect(elapsedSeconds(timer, laterMs)).toBe(300);
    expect(elapsedSeconds(timer, laterMs)).toBe(300);
  });

  it("never returns negative elapsed even if the clock looks like it went backwards", () => {
    const timer: RunningTimerState = {
      kind: "focus",
      startedAt: "2026-01-05T10:00:00.000Z",
      accumulatedSeconds: 0,
      dateKey: "2026-01-05",
    };
    const earlierMs = new Date("2026-01-05T09:59:00.000Z").getTime();
    expect(elapsedSeconds(timer, earlierMs)).toBe(0);
  });

  it("formats durations", () => {
    expect(formatHms(3661)).toBe("01:01:01");
    expect(formatMs(125)).toBe("2:05");
  });
});
