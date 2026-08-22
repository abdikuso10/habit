// Cue anchors — the "when" half of an implementation intention.
//
// Why this exists: the best-evidenced single technique in the behaviour-change
// literature is the implementation intention — a specific "when X happens, I
// will do Y" plan. Forming one is associated with an average effect size of
// about d = 0.59 on health behaviours (Gollwitzer & Sheeran's meta-analysis,
// replicated across physical activity, diet and smoking). Separately, Lally
// et al. (2010) found that automaticity grows through *context-consistent*
// repetition: the same behaviour, after the same cue, day after day.
//
// A habit in this app therefore knows not only what it is and how often it
// is scheduled, but what it comes *after*. The five daily prayers make
// unusually good anchors — they already happen, they are time-fixed, they
// are salient, and they are non-negotiable for this user — so they are the
// backbone of the anchor list rather than a generic "morning/evening" split.

import { Habit } from "@/persistence/types";

export type DayAnchor =
  | "wake"
  | "fajr"
  | "morning"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "night";

/** Chronological order through the day. Index is the sort key everywhere. */
export const DAY_ANCHORS: DayAnchor[] = [
  "wake",
  "fajr",
  "morning",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "night",
];

interface AnchorMeta {
  id: DayAnchor;
  /** Heading used when grouping the day into a timeline. */
  title: string;
  /** Reads as the "after X" clause of an implementation intention. */
  afterPhrase: string;
  arabic?: string;
}

const ANCHOR_META: Record<DayAnchor, AnchorMeta> = {
  wake: { id: "wake", title: "On waking", afterPhrase: "I wake up" },
  fajr: { id: "fajr", title: "After Fajr", afterPhrase: "Fajr", arabic: "الفجر" },
  morning: { id: "morning", title: "Morning", afterPhrase: "the morning starts" },
  dhuhr: { id: "dhuhr", title: "After Dhuhr", afterPhrase: "Dhuhr", arabic: "الظهر" },
  asr: { id: "asr", title: "After Asr", afterPhrase: "Asr", arabic: "العصر" },
  maghrib: { id: "maghrib", title: "After Maghrib", afterPhrase: "Maghrib", arabic: "المغرب" },
  isha: { id: "isha", title: "After Isha", afterPhrase: "Isha", arabic: "العشاء" },
  night: { id: "night", title: "Before sleep", afterPhrase: "the day winds down" },
};

/** Group heading for habits that genuinely have no single cue — abstentions
 * ("no khat today") are held across the whole day, not triggered by a moment.
 * Giving them a fake anchor would be worse than admitting they have none. */
export const UNANCHORED_TITLE = "All day";

export function anchorMeta(anchor: DayAnchor): AnchorMeta {
  return ANCHOR_META[anchor];
}

export function anchorTitle(anchor: DayAnchor): string {
  return ANCHOR_META[anchor].title;
}

export function anchorOrder(anchor: DayAnchor | undefined): number {
  if (!anchor) return DAY_ANCHORS.length; // unanchored sorts last
  const index = DAY_ANCHORS.indexOf(anchor);
  return index === -1 ? DAY_ANCHORS.length : index;
}

export function isDayAnchor(value: unknown): value is DayAnchor {
  return typeof value === "string" && (DAY_ANCHORS as string[]).includes(value);
}

/**
 * A habit's anchor, narrowed to the known vocabulary.
 *
 * `HabitCue.anchor` is stored as a plain string because the persistence layer
 * sits below the domain layer and must not import from it. Everything in the
 * domain reads anchors through here, so a stored value that is no longer a
 * recognised anchor degrades to "uncued" instead of crashing a render.
 */
export function habitAnchor(habit: Habit): DayAnchor | undefined {
  const anchor = habit.cue?.anchor;
  return isDayAnchor(anchor) ? anchor : undefined;
}

/**
 * The habit's cue as a standalone when-clause: "After Fajr", "Before sleep ·
 * 21:30", "In the morning · at my desk".
 *
 * This deliberately isn't the textbook "When X, I will Y" sentence. Habit
 * labels here are noun phrases — "Gym session", "Qur'an 10 minutes" — and
 * slotting those into "I will…" produces "I will gym session". The
 * behavioural content of an implementation intention is the specific,
 * pre-committed when and where; the sentence template is not what does the
 * work, so we keep the specificity and drop the grammar it can't support.
 *
 * Returns null when the habit has no cue — the UI prompts for one rather
 * than inventing a plan the user never made.
 */
export function cuePhrase(habit: Habit): string | null {
  const anchor = habitAnchor(habit);
  const detail = cueDetail(habit);
  if (!anchor) return detail;
  return detail ? `${ANCHOR_META[anchor].title} · ${detail}` : ANCHOR_META[anchor].title;
}

/**
 * Only the part of the cue that the anchor heading doesn't already say.
 *
 * Under an "After Fajr" heading, repeating "After Fajr" on every row is
 * noise; the time and place are the parts that still carry information.
 */
export function cueDetail(habit: Habit): string | null {
  const cue = habit.cue;
  if (!cue) return null;
  const parts = [cue.time, cue.place].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * True when the habit *is* the moment it's anchored to — the five prayers
 * anchor themselves. "After Fajr: Fajr on time" is circular, so the timeline
 * omits the cue line for these entirely.
 */
export function isOwnAnchor(habit: Habit): boolean {
  const anchor = habitAnchor(habit);
  return anchor !== undefined && habit.id === anchor;
}

export function hasCue(habit: Habit): boolean {
  return Boolean(habitAnchor(habit) || habit.cue?.time);
}

/** The user has decided this habit has no trigger, rather than not having
 * chosen one yet. The difference matters: one is finished, one is a prompt. */
export function isDeliberatelyAllDay(habit: Habit): boolean {
  return habit.cue?.allDay === true;
}

/** A habit that could benefit from a cue and hasn't been given or refused one. */
export function needsCue(habit: Habit): boolean {
  return !hasCue(habit) && !isDeliberatelyAllDay(habit);
}

/**
 * Anchors for the habits this app seeds, shared by new-account creation and
 * by the v5 -> v6 migration so a fresh account and an upgraded one read
 * identically for the habits they have in common.
 *
 * The five prayers anchor themselves — they *are* the cues everything else
 * hangs off, which is exactly what makes them good ones: fixed, salient, and
 * already non-negotiable parts of the day.
 *
 * Deliberately absent: noKhat, noShisha, noAlcohol, noImpulseSpending, water.
 * Those are held across the whole day rather than started at a moment, so
 * they stay uncued and group under "All day". A habit with no real trigger
 * is better shown as having none than given an invented one.
 */
/**
 * Seeded habits that deliberately have no cue: abstentions held across the
 * whole day rather than started at a moment. Marked explicitly so the app
 * never nags the user to "give this a when" — there isn't one, by design.
 */
export const SEED_ALL_DAY_HABITS = ["noKhat", "noShisha", "noAlcohol", "noImpulseSpending", "water"];

export const SEED_HABIT_CUES: Record<string, { anchor: DayAnchor }> = {
  fajr: { anchor: "fajr" },
  dhuhr: { anchor: "dhuhr" },
  asr: { anchor: "asr" },
  maghrib: { anchor: "maghrib" },
  isha: { anchor: "isha" },
  quran: { anchor: "fajr" },
  istighfar: { anchor: "asr" },
  meditation: { anchor: "morning" },
  gym: { anchor: "morning" },
  focus25: { anchor: "morning" },
  deepWork: { anchor: "morning" },
  reading: { anchor: "isha" },
  journal: { anchor: "night" },
  bedBy11: { anchor: "night" },
};

/**
 * Which anchor the day is currently sitting in, from the local clock.
 *
 * These are clock bands, not computed prayer times. Real prayer times need a
 * location and a calculation method, and fetching them would break the
 * promise that this app never talks to a network — so the app approximates,
 * and never claims otherwise in the UI. It is used only to highlight where
 * you are in the day; nothing is scored or scheduled from it.
 */
export function currentAnchor(now: Date): DayAnchor {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const at = (h: number, m = 0) => h * 60 + m;

  if (minutes >= at(3, 30) && minutes < at(5)) return "wake";
  if (minutes >= at(5) && minutes < at(6, 30)) return "fajr";
  if (minutes >= at(6, 30) && minutes < at(12)) return "morning";
  if (minutes >= at(12) && minutes < at(15)) return "dhuhr";
  if (minutes >= at(15) && minutes < at(17, 30)) return "asr";
  if (minutes >= at(17, 30) && minutes < at(19, 15)) return "maghrib";
  if (minutes >= at(19, 15) && minutes < at(22)) return "isha";
  return "night";
}

export interface AnchorGroup {
  anchor: DayAnchor | null;
  title: string;
  habits: Habit[];
}

/**
 * Rebuilds the day as a chronological timeline of cues rather than a list of
 * abstract categories. Empty anchors are dropped, so a day shows only the
 * moments that actually carry something.
 */
export function groupHabitsByAnchor(habits: Habit[]): AnchorGroup[] {
  const groups = new Map<string, AnchorGroup>();

  for (const habit of habits) {
    const anchor = habitAnchor(habit);
    const key = anchor ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, {
        anchor: anchor ?? null,
        title: anchor ? ANCHOR_META[anchor].title : UNANCHORED_TITLE,
        habits: [],
      });
    }
    groups.get(key)!.habits.push(habit);
  }

  return Array.from(groups.values()).sort(
    (a, b) => anchorOrder(a.anchor ?? undefined) - anchorOrder(b.anchor ?? undefined)
  );
}
