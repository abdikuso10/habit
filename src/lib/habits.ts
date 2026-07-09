export type PillarId = "spiritual" | "body" | "mind";

export interface HabitDef {
  id: string;
  label: string;
  jp?: string;
}

export interface PillarMeta {
  id: PillarId;
  title: string;
  arabic: string;
}

export const PILLARS_META: PillarMeta[] = [
  { id: "spiritual", title: "Spiritual", arabic: "الروح" },
  { id: "body", title: "Body", arabic: "الجسد" },
  { id: "mind", title: "Mind", arabic: "العقل" },
];

// Seed list used only when a new account is created. After that, each
// account's habits live in TrackerState.habitsByPillar and can be edited.
export function defaultHabitsByPillar(): Record<PillarId, HabitDef[]> {
  return {
    spiritual: [
      { id: "fajr", label: "Fajr on time" },
      { id: "dhuhr", label: "Dhuhr" },
      { id: "asr", label: "Asr" },
      { id: "maghrib", label: "Maghrib" },
      { id: "isha", label: "Isha" },
      { id: "quran", label: "Qur'an 10 minutes" },
      { id: "istighfar", label: "Istighfar x100" },
    ],
    body: [
      { id: "gym", label: "Gym session" },
      { id: "noKhat", label: "No khat today", jp: "カートなし" },
      { id: "noShisha", label: "No shisha today", jp: "禁煙" },
      { id: "noAlcohol", label: "No alcohol today", jp: "禁酒" },
      { id: "bedBy11", label: "In bed by 11 pm" },
      { id: "water", label: "2 litres of water" },
    ],
    mind: [
      { id: "focus", label: "25 min deep focus, phone away" },
      { id: "deepWork", label: "Deep work (4 hours)" },
      { id: "reading", label: "Read a book, 10 pages" },
      { id: "noImpulseSpending", label: "No impulse spending" },
      { id: "journal", label: "Two lines in the journal" },
      { id: "meditation", label: "Meditation" },
    ],
  };
}

export function flattenHabits(
  habitsByPillar: Record<PillarId, HabitDef[]>
): HabitDef[] {
  return PILLARS_META.flatMap((p) => habitsByPillar[p.id] ?? []);
}
