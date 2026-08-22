// Deterministic, pure v5 -> v6 migration.
//
// v6 adds one thing: an optional `cue` on each habit, so a habit can carry
// the "when" half of an implementation intention (see src/domain/cues.ts).
//
// The migration's real job is that an existing account must not land on the
// new cue-timeline view with every habit sitting in the undifferentiated
// "All day" bucket. So the seed habits — the ones this app shipped with, and
// whose meaning we actually know — get the anchor that fits them. Habits the
// user created themselves are left uncued on purpose: we have no idea when
// they do those, and guessing would put a plan in their mouth they never
// made. The app prompts them to choose instead.
//
// Like v4 -> v5 this contains no Date.now()/Math.random(), so running it
// twice on the same input produces byte-identical output, and running it on
// already-v6 data is a no-op passthrough.

import { SEED_ALL_DAY_HABITS, SEED_HABIT_CUES } from "@/domain/cues";
import { Habit, PillarId, TrackerState } from "../types";
import { LegacyTrackerStateV5 } from "../validate";

function migrateHabit(habit: Habit): Habit {
  if (habit.cue) return habit; // never overwrite a cue the user already set
  const cue = SEED_HABIT_CUES[habit.id];
  if (cue) return { ...habit, cue: { ...cue } };
  // The seeded abstentions are marked as having no cue on purpose, so the app
  // doesn't spend the rest of the journey asking them for one.
  if (SEED_ALL_DAY_HABITS.includes(habit.id)) return { ...habit, cue: { allDay: true } };
  return habit;
}

export function migrateV5ToV6(state: LegacyTrackerStateV5): TrackerState {
  const habitsByPillar = {} as Record<PillarId, Habit[]>;
  for (const pillar of ["spiritual", "body", "mind"] as PillarId[]) {
    habitsByPillar[pillar] = (state.habitsByPillar[pillar] ?? []).map(migrateHabit);
  }

  return {
    ...state,
    version: 6,
    habitsByPillar,
  };
}
