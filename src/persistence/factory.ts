import { defaultHabitsByPillar } from "@/domain/habits";
import { TrackerState } from "./types";

/*
  Four hours a day, matching what the app targeted before the v5 rewrite
  (LEGACY_DEEP_WORK_TARGET_SECONDS) and the top of the range deliberate-practice
  research supports. It seeds both the deepWork habit's own target and the
  setting that new focus habits inherit; either can be changed from the timer.
*/
const DEFAULT_FOCUS_TARGET_MINUTES = 240;
const DEFAULT_MEDITATION_MINUTES = 10;
const DEFAULT_SAVINGS_GOAL = 1_000_000;
const DEFAULT_STARTING_DEBT = 0;
const DEFAULT_CURRENCY = "KES";

export function createInitialState(passwordHash: string, dayOneDate: string): TrackerState {
  return {
    version: 6,
    passwordHash,
    dayOneDate,
    habitsByPillar: defaultHabitsByPillar(dayOneDate, DEFAULT_FOCUS_TARGET_MINUTES),
    days: {},
    commitments: [],
    money: { transactions: [] },
    settings: {
      locale: "en",
      money: {
        currency: DEFAULT_CURRENCY,
        savingsGoal: DEFAULT_SAVINGS_GOAL,
        startingDebt: DEFAULT_STARTING_DEBT,
      },
      focusTargetMinutes: DEFAULT_FOCUS_TARGET_MINUTES,
      meditationDefaultMinutes: DEFAULT_MEDITATION_MINUTES,
    },
    timer: null,
  };
}
