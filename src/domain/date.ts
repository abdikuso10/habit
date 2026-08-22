// All dates in this app are local-time calendar dates, keyed as YYYY-MM-DD.
// We deliberately avoid UTC conversion (never `toISOString().slice(0, 10)`)
// so "today" always matches the user's wall clock, including near midnight
// in time zones ahead of or behind UTC.

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

// Whole calendar days between two date keys (to - from), ignoring time of day.
export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/** 0 = Sunday .. 6 = Saturday, in local time. */
export function dayOfWeek(key: string): number {
  return parseDateKey(key).getDay();
}

export function isWeekday(key: string): boolean {
  const dow = dayOfWeek(key);
  return dow >= 1 && dow <= 5;
}

/** Monday-anchored start of the calendar week containing `key`. */
export function startOfWeek(key: string): string {
  const dow = dayOfWeek(key);
  const offsetFromMonday = dow === 0 ? -6 : 1 - dow;
  return addDays(key, offsetFromMonday);
}

export function daysInSameWeek(key: string): string[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthKey(key: string): string {
  return key.slice(0, 7); // YYYY-MM
}

export function isFutureDay(key: string, todayKeyValue: string): boolean {
  return daysBetween(todayKeyValue, key) > 0;
}

export function formatFullDate(key: string, locale?: string): string {
  const date = parseDateKey(key);
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(key: string, locale?: string): string {
  const date = parseDateKey(key);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export function formatMonthLabel(key: string, locale?: string): string {
  const date = parseDateKey(`${key}-01`);
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function clampDateKey(key: string, minKey: string, maxKey: string): string {
  if (daysBetween(minKey, key) < 0) return minKey;
  if (daysBetween(key, maxKey) < 0) return maxKey;
  return key;
}

/** The fixed finish line for this accountability journey (inclusive). */
export const JOURNEY_END_DATE = "2027-07-09";

export interface JourneyWindow {
  totalDays: number;
  dayNumber: number;
  daysRemaining: number;
  progressPct: number;
  hasStarted: boolean;
  hasEnded: boolean;
  effectiveToday: string;
}

/** Calendar-safe progress for an inclusive start/end journey. */
export function getJourneyWindow(startKey: string, todayKeyValue: string): JourneyWindow {
  const totalDays = Math.max(1, daysBetween(startKey, JOURNEY_END_DATE) + 1);
  const hasStarted = daysBetween(startKey, todayKeyValue) >= 0;
  const hasEnded = daysBetween(JOURNEY_END_DATE, todayKeyValue) > 0;
  const effectiveToday = clampDateKey(todayKeyValue, startKey, JOURNEY_END_DATE);
  const dayNumber = hasStarted
    ? Math.min(totalDays, daysBetween(startKey, effectiveToday) + 1)
    : 0;
  const daysRemaining = hasStarted
    ? Math.max(0, daysBetween(effectiveToday, JOURNEY_END_DATE))
    : totalDays;

  return {
    totalDays,
    dayNumber,
    daysRemaining,
    progressPct: Math.round((dayNumber / totalDays) * 100),
    hasStarted,
    hasEnded,
    effectiveToday,
  };
}
