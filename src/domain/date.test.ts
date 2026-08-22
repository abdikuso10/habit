import { describe, expect, it } from "vitest";
import { addDays, daysBetween, daysInSameWeek, dayOfWeek, getJourneyWindow, monthKey, startOfWeek, toDateKey } from "./date";

describe("date", () => {
  it("creates a local calendar key without UTC conversion", () => {
    const date = new Date(2026, 0, 5, 23, 59); // local Jan 5, 2026, 23:59
    expect(toDateKey(date)).toBe("2026-01-05");
  });

  it("handles leap years correctly", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // 2024 is a leap year
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01"); // 2025 is not
  });

  it("crosses year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("computes whole-day differences ignoring time of day", () => {
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
    expect(daysBetween("2026-01-01", "2026-01-10")).toBe(9);
    expect(daysBetween("2026-01-10", "2026-01-01")).toBe(-9);
  });

  it("computes day of week (0=Sunday)", () => {
    // 2026-01-04 is a Sunday
    expect(dayOfWeek("2026-01-04")).toBe(0);
    expect(dayOfWeek("2026-01-05")).toBe(1); // Monday
  });

  it("anchors weeks on Monday", () => {
    expect(startOfWeek("2026-01-04")).toBe("2025-12-29"); // Sunday -> preceding Monday
    expect(startOfWeek("2026-01-05")).toBe("2026-01-05"); // Monday -> itself
    expect(startOfWeek("2026-01-10")).toBe("2026-01-05"); // Saturday -> that week's Monday
  });

  it("returns all 7 days of the week containing a date", () => {
    const week = daysInSameWeek("2026-01-07");
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-01-05");
    expect(week[6]).toBe("2026-01-11");
  });

  it("extracts a YYYY-MM month key", () => {
    expect(monthKey("2026-03-17")).toBe("2026-03");
  });

  it("tracks an inclusive journey through 9 July 2027", () => {
    const active = getJourneyWindow("2026-08-11", "2026-08-11");
    expect(active.totalDays).toBe(333);
    expect(active.dayNumber).toBe(1);
    expect(active.daysRemaining).toBe(332);

    const finished = getJourneyWindow("2026-08-11", "2027-07-10");
    expect(finished.dayNumber).toBe(333);
    expect(finished.daysRemaining).toBe(0);
    expect(finished.progressPct).toBe(100);
    expect(finished.hasEnded).toBe(true);
  });
});
