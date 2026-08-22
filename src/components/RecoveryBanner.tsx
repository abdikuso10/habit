"use client";

import { useTracker } from "@/providers/TrackerProvider";

/*
  The day's trajectory, shown only when it says something.

  A streak counter is a loss-aversion device: it works until it breaks, and
  then it hurts — the reset gets read as a failed attempt, and the usual next
  move is to stop opening the app. But a single missed opportunity does not
  measurably affect habit formation (Lally et al., 2010); two in a row is
  where the cue-behaviour pairing starts to come apart.

  So this banner never reports a broken streak. It reports where the
  trajectory is, and what the next move is. On a steady day it stays out of
  the way entirely.
*/

const TONE = {
  recovering: { hue: "var(--hour-asr)", tint: "rgba(223, 139, 58, 0.08)" },
  rebuilding: { hue: "var(--hour-maghrib)", tint: "rgba(205, 96, 83, 0.08)" },
} as const;

export function RecoveryBanner() {
  const { dayRecovery } = useTracker();

  // "steady" and "fresh-start" are the normal cases. Saying nothing is the
  // correct thing to say about a day that's going fine.
  if (!dayRecovery || (dayRecovery.status !== "recovering" && dayRecovery.status !== "rebuilding")) {
    return null;
  }

  const tone = TONE[dayRecovery.status];

  return (
    <section
      aria-labelledby="recovery-heading"
      className="rounded-2xl border p-5"
      style={{ borderColor: tone.hue, background: tone.tint }}
    >
      <h2 id="recovery-heading" className="font-display text-lg" style={{ color: tone.hue }}>
        {dayRecovery.headline}
      </h2>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-parchment">{dayRecovery.body}</p>
    </section>
  );
}
