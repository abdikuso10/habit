"use client";

import { useMemo } from "react";
import { DAY_ANCHORS, DayAnchor, anchorTitle, habitAnchor } from "@/domain/cues";
import { flattenHabits, isHabitCompletedOnDay, isHabitScheduledOnDay } from "@/domain/habits";
import { useCurrentAnchor } from "@/hooks/useCurrentAnchor";
import { useTracker } from "@/providers/TrackerProvider";
import { ANCHOR_HUE, anchorSectionId } from "./anchorStyles";

/*
  The day drawn as the sun's passage.

  Eight points sit along a shallow arc, one per cue anchor, in the order the
  day actually runs. A point fills in as that moment's habits are completed
  and carries that hour's colour, so the shape of the day — what's behind you,
  what's ahead, where the gaps are — is readable before you read any text.

  All eight are always drawn, including moments with nothing scheduled. The
  arc is the shape of a day, not a list of tasks: holding the positions fixed
  is what makes it recognisable at a glance from one day to the next.
*/

// Quadratic bezier: left horizon -> apex -> right horizon.
const P0 = { x: 34, y: 96 };
const P1 = { x: 400, y: -6 };
const P2 = { x: 766, y: 96 };

function pointAt(t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  };
}

interface AnchorState {
  anchor: DayAnchor;
  scheduled: number;
  done: number;
  x: number;
  y: number;
}

export function DayArc() {
  const { state, today } = useTracker();
  // Re-checked on the minute so the "now" marker moves without a refresh.
  const nowAnchor = useCurrentAnchor();

  const anchors = useMemo<AnchorState[]>(() => {
    if (!state) return [];
    const habits = flattenHabits(state.habitsByPillar).filter(
      (h) => !h.archivedAt && isHabitScheduledOnDay(h, today)
    );
    const day = state.days[today];

    return DAY_ANCHORS.map((anchor, i) => {
      const forAnchor = habits.filter((h) => habitAnchor(h) === anchor);
      const { x, y } = pointAt(i / (DAY_ANCHORS.length - 1));
      return {
        anchor,
        scheduled: forAnchor.length,
        done: forAnchor.filter((h) => isHabitCompletedOnDay(h, day)).length,
        x,
        y,
      };
    });
  }, [state, today]);

  const nowState = anchors.find((a) => a.anchor === nowAnchor);

  if (!state) return null;

  return (
    <section aria-labelledby="day-arc-heading" className="rounded-2xl border border-hairline bg-panel/60 px-4 pb-4 pt-5 sm:px-6">
      <h2 id="day-arc-heading" className="sr-only">
        The shape of today
      </h2>

      <svg
        viewBox="0 0 800 120"
        className="w-full"
        style={{ height: "clamp(88px, 18vw, 128px)" }}
        role="presentation"
      >
        {/* The horizon, and the path the day travels. */}
        <line x1="14" y1="96" x2="786" y2="96" stroke="var(--hairline)" strokeWidth="1" />
        <path
          d={`M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="1.5"
        />

        {anchors.map((a) => {
          const hue = ANCHOR_HUE[a.anchor];
          const complete = a.scheduled > 0 && a.done === a.scheduled;
          const empty = a.scheduled === 0;
          const isNow = a.anchor === nowAnchor;
          const progress = a.scheduled === 0 ? 0 : a.done / a.scheduled;

          return (
            <g key={a.anchor}>
              {isNow && (
                <circle
                  cx={a.x}
                  cy={a.y}
                  r={18}
                  fill="none"
                  stroke={hue}
                  strokeWidth="1"
                  opacity="0.45"
                />
              )}
              {/* Outer ring: the ask. Inner disc: what's done of it. */}
              <circle
                cx={a.x}
                cy={a.y}
                r={empty ? 3 : 9}
                fill="none"
                stroke={empty ? "var(--hairline)" : hue}
                strokeWidth={empty ? 1 : 1.5}
                opacity={empty ? 1 : 0.8}
              />
              {!empty && progress > 0 && (
                <circle cx={a.x} cy={a.y} r={9 * Math.sqrt(progress)} fill={hue} opacity={complete ? 1 : 0.6} />
              )}
            </g>
          );
        })}
      </svg>

      {/* The arc is decorative on its own; this list carries the same
          information for assistive tech and doubles as the jump links. */}
      <ul className="mt-1 flex flex-wrap gap-x-1 gap-y-1">
        {anchors.map((a) => {
          const isNow = a.anchor === nowAnchor;
          if (a.scheduled === 0 && !isNow) return null;
          return (
            <li key={a.anchor}>
              <a
                href={`#${anchorSectionId(a.anchor)}`}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: ANCHOR_HUE[a.anchor] }}
                />
                {anchorTitle(a.anchor)}
                <span className="numeric text-faint">
                  {a.done}/{a.scheduled}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 border-t border-hairline pt-3 text-sm text-slate">
        <span className="text-parchment">{nowAnchor ? anchorTitle(nowAnchor) : "Today"}</span>
        {nowState && nowState.scheduled > 0 ? (
          <>
            {" — "}
            <span className="numeric">
              {nowState.done} of {nowState.scheduled}
            </span>{" "}
            done right now.
          </>
        ) : (
          " — nothing scheduled for this part of the day."
        )}
      </p>
    </section>
  );
}
