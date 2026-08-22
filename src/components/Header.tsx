"use client";

import { CloudOff, LockKeyhole, Settings } from "lucide-react";
import { useState } from "react";
import { formatFullDate, JOURNEY_END_DATE } from "@/domain/date";
import { useTracker } from "@/providers/TrackerProvider";
import { AnimatedNumber } from "./AnimatedNumber";
import { Nav } from "./Nav";
import { SettingsDialog } from "./SettingsDialog";

export function Header() {
  const { dayNumber, totalJourneyDays, daysRemaining, journeyProgressPct, today, lock, state, saveStatus } =
    useTracker();
  const locale = state?.settings.locale === "ar" ? "ar" : "en";
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-arabic text-lg text-gold sm:text-xl">يوم واحد</p>
            <h1 className="font-display text-2xl text-parchment sm:text-4xl">
              Day{" "}
              <span className="font-numeric text-gold">
                <AnimatedNumber value={dayNumber} />
              </span>{" "}
              of <span className="font-numeric">{totalJourneyDays}</span>
            </h1>
            <p className="mt-1 text-sm text-slate">{formatFullDate(today, locale)}</p>
            <p className="mt-2 text-xs text-slate">
              {daysRemaining === 0 ? "Journey complete" : `${daysRemaining} days to ${formatFullDate(JOURNEY_END_DATE, locale)}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Only ever shown when a write has failed. A "saved" badge on
                every tick would be noise; an unsaved one is the only state the
                user has to act on, because there is no local copy behind it. */}
            {saveStatus === "error" && (
              <span
                role="status"
                title="Your last change hasn't reached the database yet. It will keep retrying."
                className="flex items-center gap-1.5 rounded-lg border border-clay/40 bg-clay/10 px-2.5 py-2 text-xs text-clay"
              >
                <CloudOff size={13} aria-hidden="true" />
                Unsaved
              </span>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate transition hover:border-white/20 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Settings size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={lock}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate transition hover:border-white/20 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <LockKeyhole size={15} aria-hidden="true" />
              Lock
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-[11px] text-slate">
            <span>Journey progress</span>
            <span className="font-numeric text-parchment">{journeyProgressPct}%</span>
          </div>
          <div role="progressbar" aria-label="Journey progress" aria-valuenow={journeyProgressPct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-panel">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${journeyProgressPct}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Nav />
          <p className="text-sm leading-relaxed text-slate">
            <span dir="rtl" className="font-arabic text-base text-parchment">
              فَإِنَّ مَعَ الْعُسْرِ يُسْرًا
            </span>{" "}
            — &ldquo;with hardship comes ease.&rdquo;
          </p>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
