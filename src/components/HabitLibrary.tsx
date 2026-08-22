"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { cuePhrase, hasCue } from "@/domain/cues";
import { scheduleLabel } from "@/domain/habits";
import { Habit, PILLARS_META, PillarId } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { HabitEditorDialog } from "./HabitEditorDialog";

/*
  Habit management, kept off the daily screen.

  The pillars didn't go away — they're still how the week's balance is read,
  and they're still the right way to organise habits when you're editing them.
  They're just the wrong way to lay out a day you're living through, so they
  live here instead, behind a disclosure.
*/

export function HabitLibrary() {
  const { state } = useTracker();
  const [editing, setEditing] = useState<{ pillarId: PillarId; habit: Habit | null } | null>(null);

  if (!state) return null;

  return (
    <details className="rounded-2xl border border-hairline bg-panel">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm text-slate transition hover:text-parchment marker:content-none">
        Manage habits
      </summary>

      <div className="space-y-5 border-t border-hairline px-5 py-4">
        {PILLARS_META.map((pillar) => {
          const all = state.habitsByPillar[pillar.id] ?? [];
          const active = all.filter((h) => !h.archivedAt);
          const archived = all.filter((h) => h.archivedAt);

          return (
            <div key={pillar.id}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-base text-parchment">{pillar.title}</h3>
                <span className="font-arabic text-base text-gold">{pillar.arabic}</span>
              </div>

              <ul className="mt-2 space-y-0.5">
                {active.map((habit) => (
                  <li key={habit.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ pillarId: pillar.id, habit })}
                      className="w-full rounded-md px-2 py-1.5 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-sm text-parchment">{habit.label}</span>
                        <span className="text-[11px] text-faint">
                          {scheduleLabel(habit.schedule)}
                          {habit.pausedUntil && ` · paused until ${habit.pausedUntil}`}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-faint">
                        {hasCue(habit) ? (
                          cuePhrase(habit)
                        ) : (
                          <span className="text-clay/80">No cue set — tap to choose when this happens.</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {active.length === 0 && <li className="px-2 py-1 text-xs text-faint">No habits here yet.</li>}
              </ul>

              {archived.length > 0 && (
                <div className="mt-2">
                  <p className="px-2 text-[10px] uppercase tracking-widest text-faint">Archived</p>
                  {archived.map((habit) => (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => setEditing({ pillarId: pillar.id, habit })}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs text-faint transition hover:bg-white/5 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <span>{habit.label}</span>
                      <span>Restore</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setEditing({ pillarId: pillar.id, habit: null })}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Plus size={13} aria-hidden="true" />
                Add a habit to {pillar.title}
              </button>
            </div>
          );
        })}
      </div>

      {editing && (
        <HabitEditorDialog
          key={editing.habit?.id ?? `new-${editing.pillarId}`}
          open
          onClose={() => setEditing(null)}
          pillarId={editing.pillarId}
          habit={editing.habit}
        />
      )}
    </details>
  );
}
