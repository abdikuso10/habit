// Prescriptive insights — what to do next, not what already happened.
//
// The analytics module answers "how have I been doing?". That's necessary but
// it is not the thing that changes behaviour: a chart showing 43% consistency
// tells you that you are struggling without telling you what to change.
//
// Every insight here is therefore an *action*, ranked by how much difference
// taking it would make today. The ordering is deliberate:
//
//   1. never-miss-twice   — the single highest-leverage move available today
//   2. lapsed             — the ask itself is wrong; shrink it
//   3. missing-cue        — add an implementation intention (the strongest
//                           technique in the literature, ~d = 0.59)
//   4. overscheduled      — the schedule is more ambitious than the life
//   5. stale-promise      — a promise to yourself that quietly expired
//   6. weekday-risk       — a predictable weak spot worth planning around
//   7. nearly-automatic   — safe to stop spending willpower here
//
// Tone rule, enforced by review not by types: an insight never says the user
// failed. It says what is true and what the next concrete move is.

import { Analytics, possiblyOverscheduledHabits } from "./analytics";
import { HabitStrength } from "./automaticity";
import { needsCue } from "./cues";
import { daysBetween } from "./date";
import { HabitRisk } from "./recovery";
import { Commitment, Habit } from "@/persistence/types";

export type InsightKind =
  | "never-miss-twice"
  | "lapsed"
  | "missing-cue"
  | "overscheduled"
  | "stale-promise"
  | "weekday-risk"
  | "nearly-automatic";

export type InsightTone = "act-now" | "adjust" | "affirm";

export interface Insight {
  id: string;
  kind: InsightKind;
  tone: InsightTone;
  title: string;
  body: string;
  /** Why this is worth trusting. Shown small; never fabricated. */
  evidence?: string;
  /** Habit this points at, when it points at one. */
  habitId?: string;
  /** Lower sorts first. */
  priority: number;
}

const PRIORITY: Record<InsightKind, number> = {
  "never-miss-twice": 0,
  lapsed: 1,
  "missing-cue": 2,
  overscheduled: 3,
  "stale-promise": 4,
  "weekday-risk": 5,
  "nearly-automatic": 6,
};

/** Below this consistency, a habit with no cue is a prime candidate for one. */
const CUE_SUGGESTION_CONSISTENCY = 0.6;
/** Only suggest a cue once there's enough history to mean anything. */
const CUE_SUGGESTION_MIN_OPPORTUNITIES = 7;
/** A weekday is only "risky" if it's clearly worse and well evidenced. */
const WEEKDAY_RISK_MIN_RATE = 45;
const WEEKDAY_RISK_MIN_SAMPLE = 8;

export interface InsightInput {
  analytics: Analytics;
  risks: HabitRisk[];
  strengths: HabitStrength[];
  habits: Habit[];
  commitments: Commitment[];
  todayKey: string;
}

export function computeInsights(input: InsightInput): Insight[] {
  const { analytics, risks, strengths, habits, commitments, todayKey } = input;
  const insights: Insight[] = [];
  const strengthById = new Map(strengths.map((s) => [s.habitId, s]));

  // 1. Never miss twice — acting on any of these today prevents a second
  // consecutive miss, which is the point the research says actually matters.
  for (const risk of risks.filter((r) => r.isNeverMissTwiceMoment)) {
    insights.push({
      id: `never-miss-twice:${risk.habitId}`,
      kind: "never-miss-twice",
      tone: "act-now",
      title: `${risk.label} — don't miss twice`,
      body: "You missed this once. Doing it today keeps the chain of cue and action intact; missing again is what actually loosens it.",
      evidence: "Lally et al. (2010): a single missed opportunity did not measurably affect habit formation.",
      habitId: risk.habitId,
      priority: PRIORITY["never-miss-twice"],
    });
  }

  // 2. Lapsed — three or more in a row means the ask is wrong, not the person.
  for (const risk of risks.filter((r) => r.status === "lapsed")) {
    insights.push({
      id: `lapsed:${risk.habitId}`,
      kind: "lapsed",
      tone: "adjust",
      title: `${risk.label} has gone quiet`,
      body: `${risk.consecutiveMisses} scheduled days missed in a row. That usually means the habit is too big or the cue is wrong — not that you lack discipline. Shrink it to a version you'd do on your worst day, or pause it honestly.`,
      habitId: risk.habitId,
      priority: PRIORITY.lapsed,
    });
  }

  // 3. Missing cue — the highest-evidence intervention available.
  for (const habit of habits) {
    // needsCue is false both for habits that have one and for habits the
    // user has marked as all-day — an abstention has no moment to attach to.
    if (habit.archivedAt || !needsCue(habit)) continue;
    const strength = strengthById.get(habit.id);
    if (!strength || strength.opportunities < CUE_SUGGESTION_MIN_OPPORTUNITIES) continue;
    if (strength.consistency >= CUE_SUGGESTION_CONSISTENCY) continue;
    insights.push({
      id: `missing-cue:${habit.id}`,
      kind: "missing-cue",
      tone: "adjust",
      title: `Give "${habit.label}" a when`,
      body: `It's landing about ${Math.round(strength.consistency * 100)}% of the time and has no cue attached. Pick the moment it follows — after Fajr, after Asr, before sleep — so it's triggered by something that already happens instead of by remembering.`,
      evidence: "Forming a specific when-then plan (an implementation intention) shows an average effect of about d = 0.59 on health behaviours.",
      habitId: habit.id,
      priority: PRIORITY["missing-cue"],
    });
  }

  // 4. Overscheduled — reuses the existing supportive detector.
  for (const over of possiblyOverscheduledHabits(analytics.perHabitConsistency)) {
    // Don't say the same thing twice: a lapsed habit already got a message.
    if (risks.some((r) => r.habitId === over.habitId && r.status === "lapsed")) continue;
    insights.push({
      id: `overscheduled:${over.habitId}`,
      kind: "overscheduled",
      tone: "adjust",
      title: `"${over.label}" may be scheduled too often`,
      body: `Asked for on ${over.scheduledDays} days, done on ${over.pct}% of them. Cutting it to a few fixed days you'll actually hit builds the habit faster than asking daily and missing.`,
      evidence: "Automaticity grows with consistent repetition, so a smaller schedule you keep beats a larger one you don't.",
      habitId: over.habitId,
      priority: PRIORITY.overscheduled,
    });
  }

  // 5. Promises to yourself whose date has passed and that are still open.
  const stale = commitments.filter(
    (c) => c.status === "pending" && c.targetDate && daysBetween(c.targetDate, todayKey) > 0
  );
  if (stale.length > 0) {
    insights.push({
      id: "stale-promise",
      kind: "stale-promise",
      tone: "act-now",
      title: stale.length === 1 ? "One promise is past its date" : `${stale.length} promises are past their date`,
      body: "Close the loop honestly — keep it, move it, or let it go. An open promise you've stopped believing in costs more than a cancelled one.",
      priority: PRIORITY["stale-promise"],
    });
  }

  // 6. A predictable weak spot in the week.
  const worstDay = analytics.mostMissedWeekdays[0];
  if (
    worstDay &&
    worstDay.missRate >= WEEKDAY_RISK_MIN_RATE &&
    worstDay.scheduled >= WEEKDAY_RISK_MIN_SAMPLE
  ) {
    insights.push({
      id: `weekday-risk:${worstDay.dayOfWeek}`,
      kind: "weekday-risk",
      tone: "adjust",
      title: `${worstDay.label} is your hardest day`,
      body: `${worstDay.missRate}% of what's scheduled on ${worstDay.label} gets missed. Plan for it: mark it a rest day on purpose, or keep only the minimum-level habits that day.`,
      priority: PRIORITY["weekday-risk"],
    });
  }

  // 7. Something worth stopping worrying about.
  for (const strength of strengths.filter((s) => s.strengthPct >= 85)) {
    insights.push({
      id: `nearly-automatic:${strength.habitId}`,
      kind: "nearly-automatic",
      tone: "affirm",
      title: `"${strength.label}" is nearly automatic`,
      body: `${strength.repetitions} repetitions in. This one is close to running on its own — spend the attention you were giving it on something newer.`,
      habitId: strength.habitId,
      priority: PRIORITY["nearly-automatic"],
    });
  }

  return insights.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

/** The short list for the daily screen — one item per kind, so the top of the
 * day never turns into a wall of advice. */
export function topInsights(insights: Insight[], limit: number): Insight[] {
  const seenKinds = new Set<InsightKind>();
  const picked: Insight[] = [];
  for (const insight of insights) {
    if (seenKinds.has(insight.kind)) continue;
    seenKinds.add(insight.kind);
    picked.push(insight);
    if (picked.length >= limit) break;
  }
  return picked;
}
