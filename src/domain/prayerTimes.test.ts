import { describe, expect, it } from "vitest";
import { nextPrayer, prayerTimesFor, PRAYERS } from "./prayerTimes";

const hourInNairobi = (d: Date) => (d.getUTCHours() + 3) % 24;

describe("prayerTimesFor (Nairobi)", () => {
  it("returns the five prayers in chronological order", () => {
    const t = prayerTimesFor(new Date("2026-10-09T09:00:00Z"));
    const times = PRAYERS.map((p) => t[p].getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("puts Fajr before dawn and Dhuhr near midday local time", () => {
    const t = prayerTimesFor(new Date("2026-10-09T09:00:00Z"));
    expect(hourInNairobi(t.fajr)).toBeGreaterThanOrEqual(4);
    expect(hourInNairobi(t.fajr)).toBeLessThanOrEqual(5);
    expect(hourInNairobi(t.dhuhr)).toBe(12);
  });
});

describe("nextPrayer", () => {
  it("picks the next prayer later today", () => {
    const now = new Date("2026-10-09T06:00:00Z"); // 09:00 Nairobi
    expect(nextPrayer(now).prayer).toBe("dhuhr");
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    const now = new Date("2026-10-09T20:00:00Z"); // 23:00 Nairobi
    const next = nextPrayer(now);
    expect(next.prayer).toBe("fajr");
    expect(next.at.getTime()).toBeGreaterThan(now.getTime());
  });
});
