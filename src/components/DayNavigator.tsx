"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, daysBetween, formatFullDate } from "@/domain/date";

/*
  Steps the Today screen between days. Only today is editable; every earlier
  day is a read-only record (see PastDayView), so there is nothing here to go
  forward into past today.
*/
export function DayNavigator({
  viewDate,
  today,
  earliest,
  onChange,
}: {
  viewDate: string;
  today: string;
  earliest: string;
  onChange: (dateKey: string) => void;
}) {
  const isToday = viewDate === today;
  const canGoBack = daysBetween(earliest, viewDate) > 0;

  return (
    <nav aria-label="Choose a day" className="flex items-center justify-between gap-2 rounded-2xl border border-hairline bg-panel px-3 py-2">
      <button
        type="button"
        onClick={() => onChange(addDays(viewDate, -1))}
        disabled={!canGoBack}
        aria-label="Previous day"
        className="rounded-lg border border-white/10 p-2 text-slate hover:text-parchment disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <div className="min-w-0 text-center">
        <p className="truncate text-sm text-parchment" aria-live="polite">
          {isToday ? "Today" : formatFullDate(viewDate)}
        </p>
        {!isToday && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="text-xs text-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Back to today
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(addDays(viewDate, 1))}
        disabled={isToday}
        aria-label="Next day"
        className="rounded-lg border border-white/10 p-2 text-slate hover:text-parchment disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
