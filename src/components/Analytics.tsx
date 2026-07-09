"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { computeAnalytics } from "@/lib/analytics";
import { useTracker } from "@/lib/TrackerContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function Analytics() {
  const { state, today } = useTracker();

  const analytics = useMemo(() => {
    if (!state) return null;
    return computeAnalytics(state, today);
  }, [state, today]);

  if (!analytics) return null;

  return (
    <section
      aria-label="Analytics"
      className="rounded-2xl border border-white/10 bg-panel p-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-gold" aria-hidden="true" />
        <h2 className="font-display text-lg text-parchment">Analytics</h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Days tracked" value={analytics.daysTracked} />
        <Stat label="Best streak" value={analytics.bestStreak} suffix="d" />
        <Stat label="Avg completion" value={analytics.avgCompletion} suffix="%" />
        <Stat
          label="Pillars balanced"
          value={Math.min(...analytics.pillarBreakdown.map((p) => p.avgPct))}
          suffix="%"
        />
      </div>

      <div className="mt-5 space-y-2">
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
        <div className="flex items-end gap-1">
          {analytics.last14Days.map((point) => (
            <div
              key={point.dateKey}
              title={`${point.dateKey}: ${point.pct}%`}
              className="flex-1 rounded-sm bg-night"
              style={{ height: 40 }}
            >
              <div
                className="w-full rounded-sm bg-gold transition-all"
                style={{
                  height: `${Math.max(4, point.pct * 0.4)}px`,
                  marginTop: 40 - Math.max(4, point.pct * 0.4),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="font-numeric text-xl text-parchment">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      <p className="text-xs text-slate">{label}</p>
    </div>
  );
}
