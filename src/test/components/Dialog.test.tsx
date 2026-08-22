import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/Dialog";

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Test dialog">
      <p>Dialog body</p>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("exposes an accessible name via aria-labelledby pointing at the visible title", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "Test dialog" });
    expect(dialog).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("dialog", { name: "Test dialog" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes via the visible close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose exactly once per close, never leaking duplicate calls", async () => {
    const onClose = vi.fn();
    function Controlled() {
      return (
        <Dialog open onClose={onClose} title="X">
          <p>body</p>
        </Dialog>
      );
    }
    render(<Controlled />);
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
