"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { computeAnalytics } from "@/domain/analytics";
import { useTracker } from "@/providers/TrackerProvider";
import { AnimatedNumber } from "./AnimatedNumber";

export function Analytics() {
  const { state, today } = useTracker();

  const analytics = useMemo(() => {
    if (!state) return null;
    return computeAnalytics(state, today);
  }, [state, today]);

  if (!analytics) return null;

  return (
    <section aria-label="Analytics" className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-gold" aria-hidden="true" />
        <h2 className="font-display text-lg text-parchment">Analytics</h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Days tracked" value={analytics.daysTracked} />
        <Stat label="Current streak" value={analytics.currentStreak} suffix="d" />
        <Stat label="Best streak" value={analytics.bestStreak} suffix="d" />
        <Stat label="Promise points" value={analytics.promisePoints} />
        <Stat label="Scheduled completion" value={analytics.scheduledCompletionPct} suffix="%" />
        <Stat label="Minimum-day consistency" value={analytics.minimumConsistencyPct} suffix="%" />
        <Stat label="Target-day consistency" value={analytics.targetConsistencyPct} suffix="%" />
        <Stat label="Promises kept this week" value={analytics.promisesKeptThisWeek} />
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs text-slate">Pillar balance</p>
        {analytics.pillarBreakdown.map((pillar) => (
          <div key={pillar.id}>
            <div className="mb-1 flex justify-between text-xs text-slate">
              <span>{pillar.title}</span>
              <span className="font-numeric">{pillar.avgPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-night">
              <motion.div
                className="h-full rounded-full bg-green"
                initial={{ width: 0 }}
                animate={{ width: `${pillar.avgPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs text-slate">Last 14 days</p>
        <div className="flex items-end gap-1" role="img" aria-label={last14DaysSummary(analytics.last14Days)}>
          {analytics.last14Days.map((point) => (
            <div key={point.dateKey} title={`${point.dateKey}: ${point.pct}%`} className="flex-1 rounded-sm bg-night" style={{ height: 40 }} aria-hidden="true">
              <div
                className="w-full rounded-sm bg-gold transition-all"
                style={{ height: `${Math.max(4, point.pct * 0.4)}px`, marginTop: 40 - Math.max(4, point.pct * 0.4) }}
              />
            </div>
          ))}
        </div>
      </div>

      {analytics.perHabitConsistency.filter((h) => h.scheduledDays > 0).length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-xs text-slate hover:text-parchment">Per-habit consistency</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {analytics.perHabitConsistency
              .filter((h) => h.scheduledDays > 0)
              .sort((a, b) => a.pct - b.pct)
              .map((h) => (
                <li key={h.habitId} className="flex justify-between gap-2 text-slate">
                  <span className={h.archived ? "line-through opacity-60" : ""}>{h.label}</span>
                  <span className="font-numeric text-parchment">{h.pct}%</span>
                </li>
              ))}
          </ul>
        </details>
      )}

      {analytics.mostMissedWeekdays.some((w) => w.scheduled > 0) && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate hover:text-parchment">Most-missed weekdays</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {analytics.mostMissedWeekdays
              .filter((w) => w.scheduled > 0)
              .slice(0, 3)
              .map((w) => (
                <li key={w.dayOfWeek} className="flex justify-between text-slate">
                  <span>{w.label}</span>
                  <span className="font-numeric text-parchment">{w.missRate}% missed</span>
                </li>
              ))}
          </ul>
        </details>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Stat label="Savings progress" value={analytics.savingsProgressPct} suffix="%" />
        <Stat label="Debt paid down" value={analytics.debtProgressPct} suffix="%" />
      </div>
    </section>
  );
}

function last14DaysSummary(points: { dateKey: string; pct: number }[]): string {
  return `Completion over the last 14 days: ${points.map((p) => `${p.dateKey} ${p.pct}%`).join(", ")}`;
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <p className="font-numeric text-xl text-parchment">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      <p className="text-xs text-slate">{label}</p>
    </div>
  );
}
