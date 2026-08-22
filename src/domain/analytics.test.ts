import { describe, expect, it } from "vitest";
import { computeAnalytics } from "./analytics";
import { createInitialState } from "@/persistence/factory";

describe("computeAnalytics on empty data", () => {
  it("never throws and never divides by zero", () => {
    const state = createInitialState("hash", "2026-01-01");
    expect(() => computeAnalytics(state, "2026-01-01")).not.toThrow();
    const analytics = computeAnalytics(state, "2026-01-01");
    expect(analytics.daysTracked).toBe(0);
    expect(analytics.promisePoints).toBe(0);
    expect(analytics.savingsProgressPct).toBe(0);
    expect(Number.isFinite(analytics.scheduledCompletionPct)).toBe(true);
  });

  it("excludes future days from tracked-day calculations", () => {
    const state = createInitialState("hash", "2026-01-01");
    state.days["2026-01-01"] = { habits: {}, journal: "" };
    state.days["2099-01-01"] = { habits: {}, journal: "" }; // far future, should be ignored
    const analytics = computeAnalytics(state, "2026-01-01");
    expect(analytics.daysTracked).toBe(1);
  });
});
