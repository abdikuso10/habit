import { describe, expect, it } from "vitest";
import {
  DAY_ANCHORS,
  SEED_HABIT_CUES,
  UNANCHORED_TITLE,
  anchorOrder,
  currentAnchor,
  groupHabitsByAnchor,
  habitAnchor,
  hasCue,
  cueDetail,
  cuePhrase,
  isDayAnchor,
  isOwnAnchor,
} from "./cues";
import { defaultHabitsByPillar, flattenHabits } from "./habits";
import { Habit } from "@/persistence/types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    label: "Read ten pages",
    metric: { type: "checkbox" },
    schedule: { type: "daily" },
    level: "target",
    activeFrom: "2026-01-01",
    ...overrides,
  };
}

describe("cuePhrase", () => {
  it("is null when the habit has no cue — we never invent a plan", () => {
    expect(cuePhrase(habit())).toBeNull();
    expect(cuePhrase(habit({ cue: {} }))).toBeNull();
  });

  it("reads as a standalone when-clause", () => {
    expect(cuePhrase(habit({ cue: { anchor: "fajr" } }))).toBe("After Fajr");
    expect(cuePhrase(habit({ cue: { anchor: "night" } }))).toBe("Before sleep");
    expect(cuePhrase(habit({ cue: { anchor: "morning" } }))).toBe("Morning");
  });

  it("appends the time and place the anchor doesn't already say", () => {
    expect(cuePhrase(habit({ cue: { anchor: "isha", time: "21:00", place: "in the front room" } }))).toBe(
      "After Isha · 21:00 · in the front room"
    );
  });

  it("works from a time or place alone, with no anchor", () => {
    expect(cuePhrase(habit({ cue: { time: "06:30" } }))).toBe("06:30");
    expect(cuePhrase(habit({ cue: { place: "at my desk" } }))).toBe("at my desk");
  });

  it("never forces a noun label into a verb slot", () => {
    // "Gym session" must never render as "I will gym session".
    const phrase = cuePhrase(habit({ label: "Gym session", cue: { anchor: "morning" } }));
    expect(phrase).toBe("Morning");
    expect(phrase).not.toContain("I will");
  });

  it("degrades to the detail alone when the stored anchor isn't a known one", () => {
    expect(cuePhrase(habit({ cue: { anchor: "brunch" } }))).toBeNull();
    expect(cuePhrase(habit({ cue: { anchor: "brunch", time: "11:00" } }))).toBe("11:00");
    expect(habitAnchor(habit({ cue: { anchor: "brunch" } }))).toBeUndefined();
  });
});

describe("cueDetail", () => {
  it("is only the part a section heading wouldn't already say", () => {
    expect(cueDetail(habit({ cue: { anchor: "fajr" } }))).toBeNull();
    expect(cueDetail(habit({ cue: { anchor: "fajr", time: "05:30" } }))).toBe("05:30");
    expect(cueDetail(habit({ cue: { time: "05:30", place: "at my desk" } }))).toBe("05:30 · at my desk");
  });

  it("ignores blank strings rather than rendering stray separators", () => {
    expect(cueDetail(habit({ cue: { anchor: "fajr", time: "  ", place: "" } }))).toBeNull();
  });
});

describe("isOwnAnchor", () => {
  it("is true for the prayers, which are the moment they're anchored to", () => {
    expect(isOwnAnchor(habit({ id: "fajr", cue: { anchor: "fajr" } }))).toBe(true);
    expect(isOwnAnchor(habit({ id: "maghrib", cue: { anchor: "maghrib" } }))).toBe(true);
  });

  it("is false for a habit that merely follows a moment", () => {
    expect(isOwnAnchor(habit({ id: "quran", cue: { anchor: "fajr" } }))).toBe(false);
    expect(isOwnAnchor(habit({ id: "quran" }))).toBe(false);
  });
});

describe("hasCue", () => {
  it("needs an anchor or a time — a place alone isn't a trigger", () => {
    expect(hasCue(habit())).toBe(false);
    expect(hasCue(habit({ cue: { place: "at my desk" } }))).toBe(false);
    expect(hasCue(habit({ cue: { anchor: "asr" } }))).toBe(true);
    expect(hasCue(habit({ cue: { time: "07:00" } }))).toBe(true);
  });
});

describe("anchor ordering", () => {
  it("runs chronologically through the day", () => {
    expect(DAY_ANCHORS).toEqual(["wake", "fajr", "morning", "dhuhr", "asr", "maghrib", "isha", "night"]);
    expect(anchorOrder("fajr")).toBeLessThan(anchorOrder("night"));
  });

  it("sorts uncued habits last rather than first", () => {
    expect(anchorOrder(undefined)).toBeGreaterThan(anchorOrder("night"));
  });

  it("recognises exactly the known anchors", () => {
    expect(isDayAnchor("fajr")).toBe(true);
    expect(isDayAnchor("elevenses")).toBe(false);
    expect(isDayAnchor(undefined)).toBe(false);
  });
});

describe("groupHabitsByAnchor", () => {
  it("builds a chronological timeline and drops empty moments", () => {
    const groups = groupHabitsByAnchor([
      habit({ id: "a", cue: { anchor: "night" } }),
      habit({ id: "b", cue: { anchor: "fajr" } }),
      habit({ id: "c", cue: { anchor: "fajr" } }),
    ]);
    expect(groups.map((g) => g.anchor)).toEqual(["fajr", "night"]);
    expect(groups[0].habits.map((h) => h.id)).toEqual(["b", "c"]);
  });

  it("puts genuinely uncued habits in one all-day group, at the end", () => {
    const groups = groupHabitsByAnchor([habit({ id: "a" }), habit({ id: "b", cue: { anchor: "fajr" } })]);
    expect(groups[groups.length - 1].title).toBe(UNANCHORED_TITLE);
    expect(groups[groups.length - 1].anchor).toBeNull();
  });

  it("is empty for an empty day rather than rendering blank headings", () => {
    expect(groupHabitsByAnchor([])).toEqual([]);
  });
});

describe("seed cues", () => {
  it("anchors every seeded habit that has a real trigger", () => {
    const seeded = flattenHabits(defaultHabitsByPillar("2026-01-01", 90));
    const cued = seeded.filter(hasCue).map((h) => h.id).sort();
    expect(cued).toEqual(Object.keys(SEED_HABIT_CUES).sort());
  });

  it("deliberately leaves all-day abstentions uncued", () => {
    const seeded = flattenHabits(defaultHabitsByPillar("2026-01-01", 90));
    for (const id of ["noKhat", "noShisha", "noAlcohol", "noImpulseSpending", "water"]) {
      const found = seeded.find((h) => h.id === id);
      expect(found, id).toBeDefined();
      expect(hasCue(found!), id).toBe(false);
    }
  });

  it("only ever uses anchors from the known vocabulary", () => {
    for (const cue of Object.values(SEED_HABIT_CUES)) {
      expect(isDayAnchor(cue.anchor)).toBe(true);
    }
  });
});

describe("currentAnchor", () => {
  const at = (h: number, m = 0) => new Date(2026, 0, 15, h, m);

  it("maps the clock onto the day's anchors in order", () => {
    expect(currentAnchor(at(4))).toBe("wake");
    expect(currentAnchor(at(5, 30))).toBe("fajr");
    expect(currentAnchor(at(9))).toBe("morning");
    expect(currentAnchor(at(13))).toBe("dhuhr");
    expect(currentAnchor(at(16))).toBe("asr");
    expect(currentAnchor(at(18))).toBe("maghrib");
    expect(currentAnchor(at(20))).toBe("isha");
    expect(currentAnchor(at(23))).toBe("night");
  });

  it("wraps the small hours back to night rather than leaving a gap", () => {
    expect(currentAnchor(at(0, 30))).toBe("night");
    expect(currentAnchor(at(3))).toBe("night");
  });

  it("always returns a known anchor, for every minute of the day", () => {
    for (let m = 0; m < 24 * 60; m += 1) {
      expect(isDayAnchor(currentAnchor(at(Math.floor(m / 60), m % 60)))).toBe(true);
    }
  });
});
