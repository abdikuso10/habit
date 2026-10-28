"use client";

import { Check, X } from "lucide-react";
import { useId, useState } from "react";
import { todoPointsForDay, todosOf, totalTodoPoints } from "@/domain/todos";
import { useTracker } from "@/providers/TrackerProvider";

export function TodayList() {
  const { state, today, addTodo, toggleTodo, deleteTodo } = useTracker();
  const [text, setText] = useState("");
  const headingId = useId();
  if (!state) return null;

  const day = state.days[today];
  const todos = todosOf(day);
  const todayPoints = todoPointsForDay(day);
  const totalPoints = totalTodoPoints(state.days);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    addTodo(today, text);
    setText("");
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-display text-lg text-parchment">
          Today&apos;s list
        </h2>
        <span className="font-numeric text-sm text-gold" aria-label={`${todayPoints} points today, ${totalPoints} total`}>
          +{todayPoints} today · {totalPoints} total
        </span>
      </div>
      <p className="mt-1 text-xs text-slate">Add what you want to get done. Each one you finish is a point.</p>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="todo-text" className="sr-only">
          Add a task
        </label>
        <input
          id="todo-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-night px-3.5 py-2.5 text-sm text-parchment placeholder:text-slate/60 outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-gold px-4 text-sm font-medium text-night transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Add
        </button>
      </form>

      {todos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-night/60 px-3 py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={t.done}
                aria-label={t.text}
                onClick={() => toggleTodo(today, t.id)}
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  t.done ? "border-green/60 bg-green/20 text-green" : "border-white/20 text-transparent"
                }`}
              >
                <Check size={14} strokeWidth={3} aria-hidden="true" />
              </button>
              <span className={`min-w-0 flex-1 break-words text-sm ${t.done ? "text-slate line-through" : "text-parchment"}`}>
                {t.text}
              </span>
              <button
                type="button"
                onClick={() => deleteTodo(today, t.id)}
                aria-label={`Delete: ${t.text}`}
                className="rounded-lg p-1.5 text-slate transition hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
