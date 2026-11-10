import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackerProvider, useTracker } from "@/providers/TrackerProvider";

const PASSWORD = "pw";

function Harness() {
  const { loadStatus, isUnlocked, createAccount, startTimer, stopTimer, state } = useTracker();
  useEffect(() => {
    if (loadStatus === "empty") createAccount(PASSWORD, "2026-01-01");
  }, [loadStatus, createAccount]);
  if (!isUnlocked) return <p>locked</p>;
  return (
    <>
      <p>unlocked</p>
      <p>{state?.timer ? "timer running" : "timer idle"}</p>
      <button onClick={() => startTimer("focus")}>start</button>
      <button onClick={() => stopTimer()}>stop</button>
    </>
  );
}

/*
  Only setInterval and Date are faked: the auto-lock check runs on a 1s interval
  against Date.now(), while the fake server and write queue use setTimeout and
  promises, which stay real so saves can settle.
*/
function fakeClock() {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
}

/** Advance in chunks. The fake clock still fires every 1s tick inside a chunk
 * with Date moved to that tick's time; acting between chunks lets React flush. */
async function idle(ms: number) {
  const step = 10_000;
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await act(async () => {
      vi.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

async function renderUnlocked() {
  fakeClock();
  render(
    <TrackerProvider>
      <Harness />
    </TrackerProvider>
  );
  await screen.findByText("unlocked");
}

/** Wait for the write queue to drain, since auto-lock never fires with unsaved writes. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("auto-lock", () => {
  it("locks after a quiet period with no timer running", async () => {
    await renderUnlocked();
    await settle();

    await idle(60_000);
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("does not lock while a timer is running, however long it runs", async () => {
    await renderUnlocked();
    act(() => screen.getByText("start").click());
    await screen.findByText("timer running");
    await settle();

    await idle(10 * 60_000);
    expect(screen.getByText("unlocked")).toBeInTheDocument();
    expect(screen.getByText("timer running")).toBeInTheDocument();
  });

  it("restarts the quiet countdown when the timer stops, rather than locking at once", async () => {
    await renderUnlocked();
    act(() => screen.getByText("start").click());
    await screen.findByText("timer running");
    await settle();

    await idle(5 * 60_000);
    act(() => screen.getByText("stop").click());
    await screen.findByText("timer idle");
    await settle();

    // A couple of seconds after stopping: still open.
    await idle(2000);
    expect(screen.getByText("unlocked")).toBeInTheDocument();

    // A full quiet period later: locked as normal.
    await idle(60_000);
    await waitFor(() => expect(screen.getByText("locked")).toBeInTheDocument());
  });
});
