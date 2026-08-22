"use client";

import { ArrowRight, Check, Lightbulb } from "lucide-react";
import { Insight, InsightTone, topInsights } from "@/domain/insights";
import { useTracker } from "@/providers/TrackerProvider";

/*
  What to do next, rather than what already happened.

  The analytics view answers "how have I been doing?" — necessary, but a chart
  reading 43% tells you that you're struggling without telling you what to
  change. Everything here is an action, ordered by how much difference taking
  it would make today, and capped so the top of the day never becomes a wall
  of advice.
*/

const TONE_STYLE: Record<InsightTone, { hue: string; icon: typeof Check }> = {
  "act-now": { hue: "var(--hour-asr)", icon: ArrowRight },
  adjust: { hue: "var(--hour-isha)", icon: Lightbulb },
  affirm: { hue: "var(--kept)", icon: Check },
};

export function InsightList({ limit = 3, heading = "Next" }: { limit?: number; heading?: string }) {
  const { insights } = useTracker();
  const shown = topInsights(insights, limit);

  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="insights-heading" className="rounded-2xl border border-hairline bg-panel p-5">
      <h2 id="insights-heading" className="font-display text-lg text-parchment">
        {heading}
      </h2>
      <ul className="mt-3 space-y-3">
        {shown.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}
      </ul>
    </section>
  );
}

/** The full, uncapped list — for the review screen, where reading everything
 * is the point. */
export function FullInsightList() {
  const { insights } = useTracker();

  if (insights.length === 0) {
    return (
      <section className="rounded-2xl border border-hairline bg-panel p-5">
        <h2 className="font-display text-lg text-parchment">Nothing to change</h2>
        <p className="mt-1.5 text-sm text-slate">
          No habit has slipped twice, nothing is scheduled beyond what you&apos;re keeping, and no promise is past
          its date. Keep the cues where they are.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="all-insights-heading" className="rounded-2xl border border-hairline bg-panel p-5">
      <h2 id="all-insights-heading" className="font-display text-lg text-parchment">
        What would help
      </h2>
      <ul className="mt-3 space-y-3">
        {insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} showEvidence />
        ))}
      </ul>
    </section>
  );
}

function InsightRow({ insight, showEvidence = false }: { insight: Insight; showEvidence?: boolean }) {
  const { hue, icon: Icon } = TONE_STYLE[insight.tone];

  return (
    <li className="flex gap-3 border-l-2 pl-3" style={{ borderColor: hue }}>
      <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: hue }} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-parchment">{insight.title}</p>
        <p className="mt-0.5 max-w-prose text-sm leading-relaxed text-slate">{insight.body}</p>
        {showEvidence && insight.evidence && (
          <p className="mt-1 max-w-prose text-[11px] leading-snug text-faint">{insight.evidence}</p>
        )}
      </div>
    </li>
  );
}
