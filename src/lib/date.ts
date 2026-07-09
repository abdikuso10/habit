// All dates in this app are local-time calendar dates, keyed as YYYY-MM-DD.
// We deliberately avoid UTC conversion so "today" always matches the user's wall clock.

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

export function formatFullDate(key: string): string {
  const date = parseDateKey(key);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(key: string): string {
  const date = parseDateKey(key);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
