"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useTracker } from "@/lib/TrackerContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function ProgressBar() {
  const { today, getCompletionPct, streak } = useTracker();
  const pct = getCompletionPct(today);

  return (
    <section
      aria-label="Today's progress"
      className="rounded-2xl border border-white/10 bg-panel p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate">Today&apos;s completion</p>
          <p className="font-numeric text-2xl text-parchment">
            <AnimatedNumber value={pct} suffix="%" />
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5">
          <Flame
            size={16}
            className={streak > 0 ? "text-gold" : "text-slate"}
            aria-hidden="true"
          />
          <span className="font-numeric text-sm text-parchment">
            <AnimatedNumber value={streak} />
          </span>
          <span className="text-xs text-slate">
            day{streak === 1 ? "" : "s"} streak
          </span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-night"
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: pct >= 100 ? "var(--color-gold)" : "var(--color-green)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </section>
  );
}
