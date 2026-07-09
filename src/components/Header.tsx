"use client";

import { LockKeyhole } from "lucide-react";
import { formatFullDate } from "@/lib/date";
import { useTracker } from "@/lib/TrackerContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function Header() {
  const { dayNumber, today, lock } = useTracker();

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-arabic text-lg text-gold sm:text-xl">
              يوم واحد
            </p>
            <h1 className="font-display text-2xl text-parchment sm:text-4xl">
              Day{" "}
              <span className="font-numeric text-gold">
                <AnimatedNumber value={dayNumber} />
              </span>{" "}
              of <span className="font-numeric">365</span>
            </h1>
            <p className="mt-1 text-sm text-slate">{formatFullDate(today)}</p>
          </div>

          <button
            type="button"
            onClick={lock}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate transition hover:border-white/20 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <LockKeyhole size={15} aria-hidden="true" />
            Lock
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate">
          <span dir="rtl" className="font-arabic text-base text-parchment">
            فَإِنَّ مَعَ الْعُسْرِ يُسْرًا
          </span>{" "}
          — &ldquo;with hardship comes ease.&rdquo;
        </p>
      </div>
    </header>
  );
}
