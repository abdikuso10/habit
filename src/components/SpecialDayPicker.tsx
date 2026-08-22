"use client";

import { SPECIAL_DAY_META, SPECIAL_DAY_ORDER } from "@/domain/specialDays";
import { useTracker } from "@/providers/TrackerProvider";

export function SpecialDayPicker() {
  const { today, getDayRecord, setSpecialDay } = useTracker();
  const current = getDayRecord(today).specialState ?? "normal";

  return (
    <div>
      <label htmlFor="special-day" className="mb-1.5 block text-xs text-slate">
        Kind of day
      </label>
      <select
        id="special-day"
        value={current}
        onChange={(e) => setSpecialDay(today, e.target.value as typeof current)}
        className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-auto"
      >
        {SPECIAL_DAY_ORDER.map((s) => (
          <option key={s} value={s}>
            {SPECIAL_DAY_META[s].label}
          </option>
        ))}
      </select>
      {current !== "normal" && (
        <p className="mt-1.5 text-xs text-slate">{SPECIAL_DAY_META[current].description}</p>
      )}
    </div>
  );
}
