import { describe, expect, it } from "vitest";
import { DayRecord } from "@/persistence/types";
import { createTodo, todoPointsForDay, totalTodoPoints } from "./todos";

const day = (done: boolean[]): DayRecord => ({
  habits: {},
  journal: "",
  todos: done.map((d) => ({ ...createTodo("x"), done: d })),
});

describe("todo points", () => {
  it("counts only completed todos", () => {
    expect(todoPointsForDay(day([true, false, true]))).toBe(2);
  });
  it("is zero for a day with no list", () => {
    expect(todoPointsForDay(undefined)).toBe(0);
  });
  it("sums across days", () => {
    expect(totalTodoPoints({ a: day([true]), b: day([true, true, false]) })).toBe(3);
  });
  it("trims the text", () => {
    expect(createTodo("  hi ").text).toBe("hi");
  });
});
