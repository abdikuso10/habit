"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { PILLARS_META } from "@/lib/habits";
import { useTracker } from "@/lib/TrackerContext";
import { DeepWorkTimer } from "./DeepWorkTimer";
import { HabitRow } from "./HabitRow";
import { MeditationTimer } from "./MeditationTimer";

function AddHabitForm({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd(label.trim());
    setLabel("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Add a habit"
        className="min-w-0 flex-1 rounded-md border border-white/10 bg-night px-2.5 py-1.5 text-sm text-parchment placeholder:text-slate/50 outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
      <button
        type="submit"
        aria-label="Add habit"
        className="flex shrink-0 items-center justify-center rounded-md border border-white/10 px-2.5 text-slate transition hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Plus size={16} />
      </button>
    </form>
  );
}

export function PillarChecklist() {
  const { state, today, getDayRecord, toggleHabit, addHabit, editHabit, deleteHabit } =
    useTracker();
  const day = getDayRecord(today);

  if (!state) return null;

  return (
    <section aria-label="Daily habits">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PILLARS_META.map((pillar) => {
          const habits = state.habitsByPillar[pillar.id] ?? [];
          const hasMeditation = habits.some((h) => h.id === "meditation");
          const hasDeepWork = habits.some((h) => h.id === "deepWork");

          return (
            <div
              key={pillar.id}
              className="rounded-2xl border border-white/10 bg-panel p-5"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-lg text-parchment">
                  {pillar.title}
                </h2>
                <span className="font-arabic text-lg text-gold">
                  {pillar.arabic}
                </span>
              </div>
              <div className="space-y-0.5">
                {habits
                  .filter(
                    (habit) => habit.id !== "meditation" && habit.id !== "deepWork"
                  )
                  .map((habit) => (
                    <HabitRow
                      key={habit.id}
                      id={`${pillar.id}-${habit.id}`}
                      label={habit.label}
                      jp={habit.jp}
                      checked={Boolean(day.habits[habit.id])}
                      onToggle={() => toggleHabit(today, habit.id)}
                      onEdit={(label) => editHabit(pillar.id, habit.id, label)}
                      onDelete={() => deleteHabit(pillar.id, habit.id)}
                    />
                  ))}
              </div>

              <AddHabitForm onAdd={(label) => addHabit(pillar.id, label)} />

              {pillar.id === "mind" && hasDeepWork && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <DeepWorkTimer />
                </div>
              )}

              {pillar.id === "mind" && hasMeditation && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <MeditationTimer />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
