"use client";

import { useState } from "react";
import { DAY_ANCHORS, DayAnchor, anchorTitle, habitAnchor } from "@/domain/cues";
import { Habit, HabitCue, HabitLevel, HabitMetric, HabitSchedule, PillarId } from "@/persistence/types";
import { useTracker } from "@/providers/TrackerProvider";
import { ANCHOR_HUE } from "./anchorStyles";
import { Dialog } from "./Dialog";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The parent only ever mounts this dialog when there's a target to edit (or
// "add new"), and unmounts it on close — so initial state can be derived
// once from `habit` via lazy useState instead of an effect that resets state
// after the fact (which also avoids a first-render flash of stale values).
export function HabitEditorDialog({
  open,
  onClose,
  pillarId,
  habit,
}: {
  open: boolean;
  onClose: () => void;
  pillarId: PillarId;
  habit: Habit | null;
}) {
  const { editHabit, addHabit, archiveHabit, restoreHabit, pauseHabit, resumeHabit, deleteHabit, today } = useTracker();

  const [label, setLabel] = useState(() => habit?.label ?? "");
  const [level, setLevel] = useState<HabitLevel>(() => habit?.level ?? "target");
  const [metricType, setMetricType] = useState<HabitMetric["type"]>(() => habit?.metric.type ?? "checkbox");
  const [target, setTarget] = useState(() =>
    habit && (habit.metric.type === "count" || habit.metric.type === "amount") ? habit.metric.target : 1
  );
  const [unit, setUnit] = useState(() =>
    habit && (habit.metric.type === "count" || habit.metric.type === "amount") ? habit.metric.unit : ""
  );
  const [targetMinutes, setTargetMinutes] = useState(() =>
    habit && habit.metric.type === "duration" ? habit.metric.targetMinutes : 20
  );
  const [scheduleType, setScheduleType] = useState<HabitSchedule["type"]>(() => habit?.schedule.type ?? "daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() =>
    habit && habit.schedule.type === "daysOfWeek" ? habit.schedule.days : [1, 2, 3, 4, 5]
  );
  const [timesPerWeek, setTimesPerWeek] = useState(() =>
    habit && habit.schedule.type === "timesPerWeek" ? habit.schedule.target : 3
  );
  // Three states, not two: an anchor, an explicit "all day" (this habit has
  // no trigger and that's the answer), or nothing chosen yet.
  const [anchor, setAnchor] = useState<DayAnchor | "all-day" | "">(() => {
    if (!habit) return "";
    const existing = habitAnchor(habit);
    if (existing) return existing;
    return habit.cue?.allDay ? "all-day" : "";
  });
  const [cueTime, setCueTime] = useState(() => habit?.cue?.time ?? "");
  const [cuePlace, setCuePlace] = useState(() => habit?.cue?.place ?? "");
  const [pauseUntil, setPauseUntil] = useState(() => habit?.pausedUntil ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function buildMetric(): HabitMetric {
    if (metricType === "checkbox") return { type: "checkbox" };
    if (metricType === "duration") return { type: "duration", targetMinutes: Math.max(1, targetMinutes) };
    return { type: metricType, target: Math.max(1, target), unit: unit.trim() || "times" };
  }

  /** Returns undefined rather than an empty object when nothing is set, so a
   * habit with no cue stays genuinely uncued instead of carrying an empty one
   * that would read as "cue set" everywhere downstream. */
  function buildCue(): HabitCue | undefined {
    // "All day" is a decision, so it's stored. It carries no time or place,
    // because a habit held across the whole day has neither.
    if (anchor === "all-day") return { allDay: true };

    const cue: HabitCue = {};
    if (anchor) cue.anchor = anchor;
    if (cueTime.trim()) cue.time = cueTime.trim();
    if (cuePlace.trim()) cue.place = cuePlace.trim();
    return Object.keys(cue).length > 0 ? cue : undefined;
  }

  function buildSchedule(): HabitSchedule {
    if (scheduleType === "daily") return { type: "daily" };
    if (scheduleType === "weekdays") return { type: "weekdays" };
    if (scheduleType === "daysOfWeek") return { type: "daysOfWeek", days: daysOfWeek };
    return { type: "timesPerWeek", target: Math.max(1, timesPerWeek) };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const metric = buildMetric();
    const schedule = buildSchedule();
    const cue = buildCue();
    if (habit) {
      editHabit(pillarId, habit.id, { label, level, metric, schedule, cue });
    } else {
      addHabit(pillarId, { label, level, metric, schedule, cue });
    }
    onClose();
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  return (
    <Dialog open={open} onClose={onClose} title={habit ? "Edit habit" : "Add a habit"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="habit-label" className="mb-1 block text-xs text-slate">
            Name
          </label>
          <input
            id="habit-label"
            autoFocus
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>

        <div>
          <span className="mb-1 block text-xs text-slate">Level</span>
          <div className="flex gap-2" role="radiogroup" aria-label="Habit level">
            {(["minimum", "target", "stretch"] as HabitLevel[]).map((lvl) => (
              <label
                key={lvl}
                className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-center text-xs capitalize transition ${
                  level === lvl ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate hover:text-parchment"
                }`}
              >
                <input type="radio" name="level" value={lvl} checked={level === lvl} onChange={() => setLevel(lvl)} className="sr-only" />
                {lvl}
              </label>
            ))}
          </div>
        </div>

        <fieldset className="rounded-lg border border-hairline p-3">
          <legend className="px-1 text-xs text-slate">When does this happen?</legend>
          <p className="mb-2 text-[11px] leading-snug text-faint">
            Habits stick when they follow something that already happens, rather than when you remember them.
            Pick the moment this one comes after. Choose &ldquo;no set time&rdquo; for things you hold across
            the whole day, like an abstention — those have no trigger, and the app won&apos;t ask again.
          </p>

          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cue anchor">
            <AnchorChip
              label="No set time"
              selected={anchor === "all-day"}
              hue="var(--ink-faint)"
              onSelect={() => setAnchor("all-day")}
            />
            {DAY_ANCHORS.map((a) => (
              <AnchorChip
                key={a}
                label={anchorTitle(a)}
                selected={anchor === a}
                hue={ANCHOR_HUE[a]}
                onSelect={() => setAnchor(a)}
              />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2" hidden={anchor === "all-day"}>
            <div>
              <label htmlFor="habit-cue-time" className="mb-1 block text-[11px] text-slate">
                Time (optional)
              </label>
              <input
                id="habit-cue-time"
                type="time"
                value={cueTime}
                onChange={(e) => setCueTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
            </div>
            <div>
              <label htmlFor="habit-cue-place" className="mb-1 block text-[11px] text-slate">
                Place (optional)
              </label>
              <input
                id="habit-cue-place"
                type="text"
                value={cuePlace}
                onChange={(e) => setCuePlace(e.target.value)}
                placeholder="at my desk"
                className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-gold"
              />
            </div>
          </div>
        </fieldset>

        <div>
          <label htmlFor="habit-metric" className="mb-1 block text-xs text-slate">
            How is it measured?
          </label>
          <select
            id="habit-metric"
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as HabitMetric["type"])}
            className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <option value="checkbox">Checkbox (done / not done)</option>
            <option value="count">Count (e.g. glasses, pages)</option>
            <option value="duration">Duration (minutes)</option>
            <option value="amount">Amount with a unit</option>
          </select>
          {(metricType === "count" || metricType === "amount") && (
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                aria-label="Target amount"
                className="w-24 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit (e.g. glasses)"
                aria-label="Unit"
                className="flex-1 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
            </div>
          )}
          {metricType === "duration" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(Number(e.target.value))}
                aria-label="Target minutes"
                className="w-24 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              <span className="text-xs text-slate">minutes</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="habit-schedule" className="mb-1 block text-xs text-slate">
            Schedule
          </label>
          <select
            id="habit-schedule"
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value as HabitSchedule["type"])}
            className="w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="daysOfWeek">Specific days</option>
            <option value="timesPerWeek">A number of times per week</option>
          </select>
          {scheduleType === "daysOfWeek" && (
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
              {WEEKDAY_LABELS.map((label, idx) => (
                <label
                  key={label}
                  className={`cursor-pointer rounded-md border px-2 py-1 text-xs transition ${
                    daysOfWeek.includes(idx) ? "border-gold/60 bg-gold/15 text-gold" : "border-white/10 text-slate"
                  }`}
                >
                  <input type="checkbox" checked={daysOfWeek.includes(idx)} onChange={() => toggleDay(idx)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          )}
          {scheduleType === "timesPerWeek" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={7}
                value={timesPerWeek}
                onChange={(e) => setTimesPerWeek(Number(e.target.value))}
                aria-label="Times per week"
                className="w-20 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              <span className="text-xs text-slate">times per week</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {habit ? "Save changes" : "Add habit"}
          </button>
        </div>

        {habit && (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="pause-until" className="text-xs text-slate">
                Pause until
              </label>
              <input
                id="pause-until"
                type="date"
                value={pauseUntil}
                min={today}
                onChange={(e) => setPauseUntil(e.target.value)}
                className="rounded-md border border-white/10 bg-night px-2 py-1 text-xs text-parchment outline-none focus-visible:ring-2 focus-visible:ring-gold [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => {
                  if (pauseUntil) pauseHabit(pillarId, habit.id, pauseUntil);
                }}
                className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Pause
              </button>
              {habit.pausedUntil && (
                <button
                  type="button"
                  onClick={() => resumeHabit(pillarId, habit.id)}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Resume now
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {habit.archivedAt ? (
                <button
                  type="button"
                  onClick={() => {
                    restoreHabit(pillarId, habit.id);
                    onClose();
                  }}
                  className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-green hover:bg-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Restore habit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    archiveHabit(pillarId, habit.id);
                    onClose();
                  }}
                  className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Archive (keeps history)
                </button>
              )}
              {confirmDelete ? (
                <>
                  <span className="self-center text-xs text-slate">Delete permanently?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteHabit(pillarId, habit.id);
                      onClose();
                    }}
                    className="rounded-md border border-clay/50 px-2.5 py-1.5 text-xs text-clay hover:bg-clay/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate/70 hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Delete permanently
                </button>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate/70">
              Archiving keeps past history intact and just stops asking for it going forward. Deleting removes the
              habit definition permanently — past day records referencing it are untouched, but it won&apos;t show up
              again anywhere.
            </p>
          </div>
        )}
      </form>
    </Dialog>
  );
}

function AnchorChip({
  label,
  selected,
  hue,
  onSelect,
}: {
  label: string;
  selected: boolean;
  hue: string;
  onSelect: () => void;
}) {
  return (
    <label
      className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition"
      style={{
        borderColor: selected ? hue : "var(--hairline)",
        color: selected ? hue : "var(--ink-dim)",
        background: selected ? `color-mix(in srgb, ${hue} 14%, transparent)` : "transparent",
      }}
    >
      <input type="radio" name="cue-anchor" checked={selected} onChange={onSelect} className="sr-only" />
      {label}
    </label>
  );
}
