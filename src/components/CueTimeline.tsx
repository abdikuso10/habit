"use client";

import { Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AnchorGroup, cueDetail, groupHabitsByAnchor, isOwnAnchor } from "@/domain/cues";
import { flattenHabits, isHabitCompletedOnDay, isHabitScheduledOnDay } from "@/domain/habits";
import { useCurrentAnchor } from "@/hooks/useCurrentAnchor";
import { Habit, PILLARS_META, PillarId } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { ANCHOR_HUE, UNANCHORED_HUE, anchorSectionId } from "./anchorStyles";
import { FocusTimer } from "./FocusTimer";
import { HabitEditorDialog } from "./HabitEditorDialog";
import { HabitProgressControl } from "./HabitProgressControl";
import { MeditationTimer } from "./MeditationTimer";

/*
  Today's habits, laid out as the day runs rather than by category.

  Grouping by pillar answers "which part of my life is this?", which is a
  question for reviewing the week. Grouping by cue answers "what happens
  next?", which is the question you actually have at 6am. Since automaticity
  is built by repeating a behaviour after a consistent trigger, the daily
  screen is organised by trigger — the pillars still exist, and still drive
  the weekly balance view and habit management.
*/

/**
 * Habits whose completion comes from a timer, not from a control on the row.
 *
 * `habitValueOnDay` reads these from the day's `focusSeconds` /
 * `meditationSeconds`, so a manual stepper on the row would write to a field
 * nothing reads — it would look like it worked and change nothing. The timer
 * below the group is the real control for both.
 */
const TIMER_DRIVEN = new Set(["deepWork", "meditation"]);

/** Finds the pillar a habit belongs to, for the edit dialog. */
function pillarOf(habitsByPillar: Record<PillarId, Habit[]>, habitId: string): PillarId {
  for (const pillar of PILLARS_META) {
    if ((habitsByPillar[pillar.id] ?? []).some((h) => h.id === habitId)) return pillar.id;
  }
  return "mind";
}

export function CueTimeline() {
  const { state, today, toggleCheckboxHabit, setHabitValue } = useTracker();
  const nowAnchor = useCurrentAnchor();
  const [editing, setEditing] = useState<{ pillarId: PillarId; habit: Habit } | null>(null);

  const groups = useMemo<AnchorGroup[]>(() => {
    if (!state) return [];
    const scheduled = flattenHabits(state.habitsByPillar).filter(
      (h) => !h.archivedAt && isHabitScheduledOnDay(h, today)
    );
    return groupHabitsByAnchor(scheduled);
  }, [state, today]);

  if (!state) return null;

  const day = state.days[today];

  if (groups.length === 0) {
    return (
      <section aria-label="Today's habits" className="rounded-2xl border border-hairline bg-panel p-5">
        <p className="text-sm text-slate">
          Nothing is scheduled for today. That&apos;s a legitimate answer — a day with no ask is not a day missed.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Today's habits" className="space-y-3">
      {groups.map((group) => {
        const hue = group.anchor ? ANCHOR_HUE[group.anchor] : UNANCHORED_HUE;
        const done = group.habits.filter((h) => isHabitCompletedOnDay(h, day)).length;
        const isNow = group.anchor !== null && group.anchor === nowAnchor;
        const complete = done === group.habits.length;

        return (
          <section
            key={group.anchor ?? "all-day"}
            id={anchorSectionId(group.anchor)}
            aria-labelledby={`${anchorSectionId(group.anchor)}-heading`}
            className="scroll-mt-4 overflow-hidden rounded-2xl border bg-panel"
            style={{
              // The current moment is the only thing on the page allowed to
              // draw attention to itself.
              borderColor: isNow ? hue : "var(--hairline)",
              boxShadow: isNow ? `inset 3px 0 0 ${hue}` : undefined,
            }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-4">
              <h3
                id={`${anchorSectionId(group.anchor)}-heading`}
                className="flex items-baseline gap-2 font-display text-lg"
                style={{ color: hue }}
              >
                {group.title}
                {isNow && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-night" style={{ background: hue }}>
                    now
                  </span>
                )}
              </h3>
              <p className="numeric text-xs" style={{ color: complete ? "var(--kept)" : "var(--ink-faint)" }}>
                {done}/{group.habits.length}
              </p>
            </div>

            <div className="mt-1 divide-y divide-white/5 px-5 pb-4">
              {group.habits.filter((h) => !TIMER_DRIVEN.has(h.id)).map((habit) => {
                // The section heading already says "After Fajr"; only the
                // time and place still carry information here. The prayers
                // anchor themselves, so they get no cue line at all.
                const detail = isOwnAnchor(habit) ? null : cueDetail(habit);
                return (
                  <div key={habit.id} className="group flex items-start gap-1 py-0.5">
                    <div className="min-w-0 flex-1">
                      <HabitProgressControl
                        habit={habit}
                        day={day}
                        onToggleCheckbox={() => toggleCheckboxHabit(today, habit.id)}
                        onSetValue={(v) => setHabitValue(today, habit.id, v)}
                      />
                      {detail && <p className="pl-8 text-[11px] leading-snug text-faint">{detail}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({ pillarId: pillarOf(state.habitsByPillar, habit.id), habit })
                      }
                      aria-label={`Edit ${habit.label}`}
                      className="mt-1.5 shrink-0 rounded p-1.5 text-faint opacity-0 transition hover:text-parchment focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:opacity-100"
                    >
                      <Settings2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}

              {/* Timers live with the habits they feed, rather than in a
                  separate tools section detached from the reason to use them. */}
              {group.habits.some((h) => h.id === "deepWork") && (
                <div className="pt-3">
                  <FocusTimer />
                </div>
              )}
              {group.habits.some((h) => h.id === "meditation") && (
                <div className="pt-3">
                  <MeditationTimer />
                </div>
              )}
            </div>
          </section>
        );
      })}

      {editing && (
        <HabitEditorDialog
          key={editing.habit.id}
          open
          onClose={() => setEditing(null)}
          pillarId={editing.pillarId}
          habit={editing.habit}
        />
      )}
    </section>
  );
}
