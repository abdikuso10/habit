import { SpecialDayState } from "@/persistence/types";

export const SPECIAL_DAY_META: Record<SpecialDayState, { label: string; description: string }> = {
  normal: { label: "Normal day", description: "An ordinary day on the calendar." },
  rest: { label: "Rest", description: "A planned day off. Still shows up, still counts as showing up." },
  sick: { label: "Sick", description: "Recovering. Scheduled habits are excused, not missed." },
  travel: { label: "Travel", description: "On the move. Habits are excused, not missed." },
  recovery: { label: "Recovery", description: "Coming back gently after a hard stretch." },
};

export const SPECIAL_DAY_ORDER: SpecialDayState[] = ["normal", "rest", "sick", "travel", "recovery"];

const SUPPORTIVE_MESSAGES: Record<"low" | "minimum" | "target" | "stretch" | "special", string[]> = {
  low: [
    "You can begin again today.",
    "One completed promise is progress.",
    "Tomorrow is a full page.",
  ],
  minimum: ["A minimum day still counts.", "You kept moving.", "That's enough for today."],
  target: ["Solid day. You showed up for your word.", "You kept moving, and it added up."],
  stretch: ["Excellent day — you went beyond what you asked of yourself.", "That's a day to remember."],
  special: ["Rest is part of the plan, not a break from it.", "Taking care of yourself counts too."],
};

export function supportiveMessage(
  tier: "low" | "minimum" | "target" | "stretch" | "special"
): string {
  const options = SUPPORTIVE_MESSAGES[tier];
  return options[0];
}
