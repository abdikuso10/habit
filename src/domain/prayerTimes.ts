// Calculated prayer times for reminders.
//
// Unlike the clock bands in cues.ts (which only highlight where you are in the
// day), these are real times from the sun's position, computed on-device by
// the `adhan` library — no network request, so the app's "never talks to a
// network for this" promise still holds. Location is fixed to Nairobi.

import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";

export type Prayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYERS: Prayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_LABEL: Record<Prayer, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const NAIROBI = new Coordinates(-1.2921, 36.8219);

function params() {
  const p = CalculationMethod.MuslimWorldLeague();
  p.madhab = Madhab.Shafi;
  return p;
}

export function prayerTimesFor(date: Date): Record<Prayer, Date> {
  const t = new PrayerTimes(NAIROBI, date, params());
  return { fajr: t.fajr, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

export interface UpcomingPrayer {
  prayer: Prayer;
  at: Date;
}

/** The first prayer strictly after `now`, rolling over to tomorrow's Fajr
 * once Isha has passed. */
export function nextPrayer(now: Date): UpcomingPrayer {
  const today = prayerTimesFor(now);
  for (const prayer of PRAYERS) {
    if (today[prayer].getTime() > now.getTime()) return { prayer, at: today[prayer] };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { prayer: "fajr", at: prayerTimesFor(tomorrow).fajr };
}
