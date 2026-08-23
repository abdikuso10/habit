// Yesterday, scored per sector and reported the next morning.
//
// The rest of this app deliberately avoids verdicts — recovery.ts says so in
// its own comment, and RecoveryBanner never reports a broken streak. This
// module is the exception, added on request: it names the weakest sector and
// asks for it to be better today. It is the only place in the codebase that
// speaks that way, which is why it lives in its own file rather than being
// folded into recovery.ts, where it would sit against that module's stated
// intent.
//
// Special days stay excused here as everywhere else. Rest, sickness and travel
// are answers, not failures, and scoring them would make the excusal
// meaningless.

import { isSpecialDay } from "./completion";
import { addDays } from "./date";
import { isHabitCompletedOnDay, isHabitScheduledOnDay } from "./habits";
import { Habit, PILLARS_META, PillarId, TrackerState } from "@/persistence/types";

/** Below this, a sector is called out as poor rather than merely incomplete. */
export const POOR_SECTOR_THRESHOLD = 50;

export interface SectorReview {
  id: PillarId;
  title: string;
  scheduled: number;
  completed: number;
  pct: number;
}

export interface DayReview {
  /** The day being reported on — the calendar day before `todayKey`. */
  dateKey: string;
  overallPct: number;
  /** Every pillar, in PILLARS_META order, including ones with nothing scheduled. */
  sectors: SectorReview[];
  /** Lowest-scoring sector that actually asked something. Null when no sector did. */
  weakest: SectorReview | null;
  /** True when the weakest sector fell below POOR_SECTOR_THRESHOLD. */
  poor: boolean;
  headline: string;
  body: string;
}

function reviewSector(habits: Habit[], pillarId: PillarId, title: string, state: TrackerState, dateKey: string): SectorReview {
  const day = state.days[dateKey];
  const scheduledHabits = habits.filter((h) => isHabitScheduledOnDay(h, dateKey));
  const completed = scheduledHabits.filter((h) => isHabitCompletedOnDay(h, day)).length;
  return {
    id: pillarId,
    title,
    scheduled: scheduledHabits.length,
    completed,
    // A sector that asked nothing is not a sector that was failed.
    pct: scheduledHabits.length === 0 ? 100 : Math.round((completed / scheduledHabits.length) * 100),
  };
}

/**
 * Builds the report for the day before `todayKey`, or null when there is
 * nothing to report: before day one, or on a day that was excused.
 *
 * Only the immediately preceding day is considered. A report that reached
 * further back would be reporting on a day the user has already been shown,
 * and the point of this is the morning after.
 */
export function computeDayReview(state: TrackerState, todayKey: string): DayReview | null {
  const dateKey = addDays(todayKey, -1);

  // Nothing precedes day one, and a habit's activeFrom means the day before
  // the journey started asked nothing of anyone.
  if (dateKey < state.dayOneDate) return null;

  const day = state.days[dateKey];
  if (isSpecialDay(day?.specialState)) return null;

  const sectors = PILLARS_META.map((pillar) =>
    reviewSector(state.habitsByPillar[pillar.id] ?? [], pillar.id, pillar.title, state, dateKey)
  );

  const asked = sectors.filter((s) => s.scheduled > 0);
  if (asked.length === 0) return null;

  const totalScheduled = asked.reduce((sum, s) => sum + s.scheduled, 0);
  const totalCompleted = asked.reduce((sum, s) => sum + s.completed, 0);
  const overallPct = Math.round((totalCompleted / totalScheduled) * 100);

  // Ties go to the sector listed first in PILLARS_META, so the same day always
  // produces the same report rather than depending on sort stability.
  const weakest = asked.reduce((worst, s) => (s.pct < worst.pct ? s : worst), asked[0]);
  const poor = weakest.pct < POOR_SECTOR_THRESHOLD;

  return { dateKey, overallPct, sectors, weakest, poor, ...phrasing(weakest, overallPct, poor) };
}

/*
  Blunt by request. The wording names the sector and asks for it to improve,
  rather than describing a trajectory the way the rest of the app does.

  A complete day still gets said out loud: the report appears every morning, so
  staying silent on a good day would make the dialog read as pure criticism.
*/
function phrasing(weakest: SectorReview, overallPct: number, poor: boolean): { headline: string; body: string } {
  if (overallPct === 100) {
    return {
      headline: "Yesterday was complete.",
      body: "Every sector finished what it asked. Hold this today.",
    };
  }

  if (poor) {
    return {
      headline: `${weakest.title} — ${weakest.completed} of ${weakest.scheduled}`,
      body: "You performed poorly in this sector. Please improve on this today.",
    };
  }

  return {
    headline: `${weakest.title} — ${weakest.completed} of ${weakest.scheduled}`,
    body: `This was your weakest sector yesterday, at ${overallPct}% overall. Improve on it today.`,
  };
}
