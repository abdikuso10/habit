"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { possiblyOverscheduledHabits } from "@/domain/analytics";
import { commitmentsKeptInWeekOf } from "@/domain/commitments";
import { computeDayLevels, completionPct, pillarCompletionPct } from "@/domain/completion";
import { addDays, daysBetween, formatShortDate, getJourneyWindow, JOURNEY_END_DATE, startOfWeek } from "@/domain/date";
import { flattenHabits } from "@/domain/habits";
import { PILLARS_META } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { computeAnalytics } from "@/domain/analytics";
import { MoneyAccountCard } from "@/components/MoneyAccountCard";
import { PromiseHistory } from "@/components/PromiseHistory";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekPage() {
  const { state, today } = useTracker();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const data = useMemo(() => {
    if (!state) return null;
    const { effectiveToday } = getJourneyWindow(state.dayOneDate, today);
    const habits = flattenHabits(state.habitsByPillar);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const trackedDays = weekDays.filter(
      (key) => daysBetween(state.dayOneDate, key) >= 0 && daysBetween(key, effectiveToday) >= 0
    );

    const days = weekDays.map((key) => {
      const isFuture = daysBetween(effectiveToday, key) > 0;
      const isInJourney = daysBetween(state.dayOneDate, key) >= 0 && daysBetween(key, JOURNEY_END_DATE) >= 0;
      const isTracked = isInJourney && !isFuture;
      const day = state.days[key];
      return {
        key,
        pct: isTracked ? completionPct(habits, day, key) : 0,
        levels: isTracked ? computeDayLevels(habits, day, key) : null,
        special: day?.specialState,
        isFuture,
        isTracked,
      };
    });

    const avgPct = trackedDays.length
      ? Math.round(trackedDays.reduce((s, k) => s + completionPct(habits, state.days[k], k), 0) / trackedDays.length)
      : 0;

    const minimumConsistentDays = trackedDays.filter((k) => computeDayLevels(habits, state.days[k], k).minimum.met).length;

    const pillarBalance = PILLARS_META.map((p) => ({
      id: p.id,
      title: p.title,
      avgPct: trackedDays.length
        ? Math.round(
            trackedDays.reduce((s, k) => s + pillarCompletionPct(state.habitsByPillar, p.id, state.days[k], k), 0) /
              trackedDays.length
          )
        : 0,
    }));

    const focusMinutes = trackedDays.reduce((s, k) => s + Math.floor((state.days[k]?.focusSeconds ?? 0) / 60), 0);
    const keptThisWeek = commitmentsKeptInWeekOf(state.commitments, weekStart).length;

    const analytics = computeAnalytics(state, today);
    const overscheduled = possiblyOverscheduledHabits(analytics.perHabitConsistency);

    return { days, avgPct, minimumConsistentDays, trackedCount: trackedDays.length, pillarBalance, focusMinutes, keptThisWeek, overscheduled };
  }, [state, weekStart, today]);

  if (!state || !data) return null;

  const lastJourneyWeek = startOfWeek(JOURNEY_END_DATE);
  const isCurrentWeek = weekStart === startOfWeek(today);
  const isLastJourneyWeek = daysBetween(weekStart, lastJourneyWeek) <= 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Previous week"
            className="rounded-lg border border-white/10 p-2 text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <h1 className="font-display text-lg text-parchment">
            Week of {formatShortDate(weekStart)}
            {isCurrentWeek && <span className="ml-2 text-xs text-gold">(this week)</span>}
          </h1>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Next week"
            disabled={isCurrentWeek || isLastJourneyWeek}
            className="rounded-lg border border-white/10 p-2 text-slate hover:text-parchment disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {data.days.map((d, i) => (
            <div key={d.key} className="text-center">
              <p className="text-[10px] text-slate">{WEEKDAY_LABELS[i]}</p>
              <div
                className={`mx-auto mt-1 flex h-10 w-full items-center justify-center rounded-lg text-xs font-numeric ${
                  d.isFuture ? "bg-night text-slate/40" : d.pct >= 100 ? "bg-gold text-night" : d.pct > 0 ? "bg-green/70 text-night" : "bg-night text-slate"
                }`}
                title={`${d.key}: ${d.isFuture ? "upcoming" : `${d.pct}%`}`}
              >
                {d.isFuture ? "—" : `${d.pct}%`}
              </div>
              {d.special && d.special !== "normal" && <p className="mt-1 text-[9px] text-slate">{d.special}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Average completion" value={`${data.avgPct}%`} />
        <StatCard label="Minimum-day consistency" value={`${data.trackedCount ? Math.round((data.minimumConsistentDays / data.trackedCount) * 100) : 0}%`} />
        <StatCard label="Promises kept" value={String(data.keptThisWeek)} />
        <StatCard label="Focus minutes" value={String(data.focusMinutes)} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="font-display text-lg text-parchment">Pillar balance this week</h2>
        <div className="mt-3 space-y-2">
          {data.pillarBalance.map((p) => (
            <div key={p.id}>
              <div className="mb-1 flex justify-between text-xs text-slate">
                <span>{p.title}</span>
                <span className="font-numeric">{p.avgPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-night">
                <div className="h-full rounded-full bg-green" style={{ width: `${p.avgPct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {data.overscheduled.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-panel p-5">
          <h2 className="font-display text-lg text-parchment">Worth a second look</h2>
          <p className="mt-1 text-xs text-slate">
            These might be scheduled more often than currently fits — not a failure, just a signal.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate">
            {data.overscheduled.map((h) => (
              <li key={h.habitId}>
                {h.label} — completed {h.pct}% of the time it was scheduled
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="font-display text-lg text-parchment">This week, in short</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">{weeklyReflection(data)}</p>
      </section>

      <PromiseHistory />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MoneyAccountCard account="savings" />
        <MoneyAccountCard account="debt" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-3 text-center">
      <p className="font-numeric text-lg text-parchment">{value}</p>
      <p className="text-[11px] text-slate">{label}</p>
    </div>
  );
}

function weeklyReflection(data: { avgPct: number; keptThisWeek: number; focusMinutes: number; trackedCount: number }): string {
  if (data.trackedCount === 0) return "This week hasn't started yet.";
  if (data.avgPct >= 80) return `A strong week — ${data.avgPct}% average completion, ${data.keptThisWeek} promises kept, and ${data.focusMinutes} focus minutes logged.`;
  if (data.avgPct >= 40) return `A steady week. ${data.avgPct}% average completion and ${data.keptThisWeek} promises kept — real progress, even on the harder days.`;
  return `A quieter week — ${data.avgPct}% average completion. It still counts, and next week is a fresh page.`;
}
