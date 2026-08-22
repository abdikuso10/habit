"use client";

import { useMemo } from "react";
import { bestWeeks, computeAnalytics } from "@/domain/analytics";
import { formatMonthLabel, formatShortDate, addDays, getJourneyWindow, JOURNEY_END_DATE } from "@/domain/date";
import { useTracker } from "@/providers/TrackerProvider";
import { Analytics } from "@/components/Analytics";
import { FullInsightList } from "@/components/InsightList";
import { HabitStrengthPanel } from "@/components/HabitStrengthPanel";
import { YearGrid } from "@/components/YearGrid";

const MILESTONE_DAYS = [7, 30, 100, 200];

export default function JourneyPage() {
  const { state, today, dayNumber } = useTracker();

  const analytics = useMemo(() => (state ? computeAnalytics(state, today) : null), [state, today]);
  const top = useMemo(() => (analytics ? bestWeeks(analytics.weeklyTrend, 3) : []), [analytics]);

  if (!state || !analytics) return null;

  const journey = getJourneyWindow(state.dayOneDate, today);
  const milestones = [...MILESTONE_DAYS.filter((n) => n < journey.totalDays), journey.totalDays].map((n) => ({
    day: n,
    dateKey: n === journey.totalDays ? JOURNEY_END_DATE : addDays(state.dayOneDate, n - 1),
    reached: dayNumber >= n,
  }));

  return (
    <div className="space-y-6">
      <YearGrid />

      <FullInsightList />
      <HabitStrengthPanel />
      <Analytics />

      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="font-display text-lg text-parchment">Milestones</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {milestones.map((m) => (
            <li
              key={m.day}
              className={`rounded-lg border p-2 text-center text-xs ${
                m.reached ? "border-gold/50 bg-gold/10 text-gold" : "border-white/10 text-slate"
              }`}
            >
              <p className="font-numeric text-base">Day {m.day}</p>
              <p>{m.reached ? formatShortDate(m.dateKey) : "not yet"}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="font-display text-lg text-parchment">Best weeks</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-slate">Keep going — your best weeks will show up here.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {top.map((w, i) => (
              <li key={w.weekStart} className="flex items-center justify-between rounded-lg border border-white/10 bg-night/50 px-3 py-2 text-sm">
                <span className="text-slate">
                  #{i + 1} · Week of {formatShortDate(w.weekStart)}
                </span>
                <span className="font-numeric text-parchment">{w.avgPct}%</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="font-display text-lg text-parchment">Monthly summary</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <caption className="sr-only">Average completion percentage by month</caption>
            <thead>
              <tr className="text-xs text-slate">
                <th scope="col" className="pb-1 font-normal">
                  Month
                </th>
                <th scope="col" className="pb-1 font-normal">
                  Avg completion
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.monthlyTrend.map((m) => (
                <tr key={m.month} className="border-t border-white/5">
                  <td className="py-1.5 text-parchment">{formatMonthLabel(m.month)}</td>
                  <td className="py-1.5 font-numeric text-parchment">{m.avgPct}%</td>
                </tr>
              ))}
              {analytics.monthlyTrend.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-2 text-slate">
                    No tracked months yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

