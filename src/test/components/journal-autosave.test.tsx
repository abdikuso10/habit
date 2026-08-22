import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { fakeServer } from "@/test/setup";
import { Journal } from "@/components/Journal";
import { TrackerProvider, useTracker } from "@/providers/TrackerProvider";

const PASSWORD = "pw";

function Harness() {
  const { loadStatus, isUnlocked, createAccount, unlock } = useTracker();
  useEffect(() => {
    if (loadStatus === "empty") createAccount(PASSWORD, "2026-01-01");
    if (loadStatus === "ready" && !isUnlocked) unlock(PASSWORD);
  }, [loadStatus, isUnlocked, createAccount, unlock]);
  if (loadStatus !== "ready" || !isUnlocked) return <p>loading</p>;
  return <Journal />;
}

/*
  The journal used to be debounced against localStorage, and this test asserted
  the "Saving… -> Saved" window that produced. Writes now go through the remote
  queue, which coalesces instead of debouncing: at most one request in flight,
  newest state wins. The behaviour worth protecting is unchanged — typing must
  not produce a write per keystroke — so that is what is asserted, rather than a
  timing window that no longer exists.
*/
describe("Journal autosave", () => {
  it("coalesces writes: many keystrokes, few saves, and settles on Saved", async () => {
    const user = userEvent.setup();
    render(
      <TrackerProvider>
        <Harness />
      </TrackerProvider>
    );

    const textarea = await screen.findByLabelText(/Journal entry for/);

    const before = fakeServer.putCount;
    const entry = "Kept my word today.";
    await user.type(textarea, entry);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"), { timeout: 3000 });

    const writes = fakeServer.putCount - before;
    expect(writes).toBeGreaterThan(0);
    expect(writes).toBeLessThan(entry.length);

    expect(textarea).toHaveValue(entry);
  });
});
