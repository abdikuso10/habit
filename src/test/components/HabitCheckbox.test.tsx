import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HabitCheckbox } from "@/components/HabitCheckbox";

describe("HabitCheckbox", () => {
  it("is reachable and toggleable by keyboard alone (Tab + Space)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<HabitCheckbox id="gym" label="Gym session" checked={false} onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole("checkbox", { name: /Gym session/ })).toHaveFocus();

    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not communicate completion by color alone — the label also strikes through", () => {
    const { rerender } = render(<HabitCheckbox id="gym" label="Gym session" checked={false} onChange={() => {}} />);
    expect(screen.getByText("Gym session")).not.toHaveClass("line-through");

    rerender(<HabitCheckbox id="gym" label="Gym session" checked onChange={() => {}} />);
    expect(screen.getByText("Gym session")).toHaveClass("line-through");
  });
});
