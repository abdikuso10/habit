// Today's list — one-off tasks for a single day. Like promise points, the
// point total is never stored: it is derived from which tasks are done, so it
// can't drift, double-count, or go negative.

import { DayRecord, TodoItem } from "@/persistence/types";

export const POINTS_PER_TODO = 1;

export function generateTodoId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createTodo(text: string): TodoItem {
  return { id: generateTodoId(), text: text.trim(), done: false };
}

export function todosOf(day: DayRecord | undefined): TodoItem[] {
  return day?.todos ?? [];
}

export function todoPointsForDay(day: DayRecord | undefined): number {
  return todosOf(day).filter((t) => t.done).length * POINTS_PER_TODO;
}

export function totalTodoPoints(days: Record<string, DayRecord>): number {
  return Object.values(days).reduce((sum, day) => sum + todoPointsForDay(day), 0);
}
