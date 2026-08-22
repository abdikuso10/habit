import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { CommitmentQuickEntry } from "@/components/CommitmentQuickEntry";
import { PendingCommitments } from "@/components/PendingCommitments";
import { PromiseHistory } from "@/components/PromiseHistory";
import { TrackerProvider, useTracker } from "@/providers/TrackerProvider";

const PASSWORD = "correct horse battery staple";

/** Mirrors what AppChrome does (create-if-empty, unlock-if-locked) without
 * the surrounding screens, so these tests exercise the real provider +
 * repository + localStorage, not a mock. */
function Harness() {
  const { loadStatus, isUnlocked, createAccount, unlock } = useTracker();

  useEffect(() => {
    if (loadStatus === "empty") createAccount(PASSWORD, "2026-01-01");
    if (loadStatus === "ready" && !isUnlocked) unlock(PASSWORD);
  }, [loadStatus, isUnlocked, createAccount, unlock]);

  if (loadStatus !== "ready" || !isUnlocked) return <p>loading</p>;

  return (
    <>
      <CommitmentQuickEntry />
      <PendingCommitments />
      <PromiseHistory />
    </>
  );
}

function renderHarness() {
  return render(
    <TrackerProvider>
      <Harness />
    </TrackerProvider>
  );
}

async function makePromise(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByPlaceholderText("What will you do?");
  await user.clear(input);
  await user.type(input, text);
  await user.click(screen.getByRole("button", { name: "Make the promise" }));
}

describe("Promises Kept integration", () => {
  it("creating, keeping, and undoing a promise drives the point total correctly", async () => {
    const user = userEvent.setup();
    renderHarness();
    await waitFor(() => expect(screen.getByPlaceholderText("What will you do?")).toBeInTheDocument());

    await makePromise(user, "I will read for 20 minutes");
    expect(await screen.findByText("I will read for 20 minutes")).toBeInTheDocument();

    // Lifetime points start at zero.
    expect(screen.getByText("Lifetime points").previousSibling).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: "Kept it" }));

    // Exactly one point is awarded, and the item leaves the pending list.
    await waitFor(() => expect(screen.getByText("Lifetime points").previousSibling).toHaveTextContent("1"));
    expect(screen.queryByRole("button", { name: "Kept it" })).not.toBeInTheDocument();
    expect(screen.getByText("Nothing pending. Whenever you say you'll do something, it lands here.", { exact: false })).toBeInTheDocument();

    // Undo removes the derived point and returns it to pending.
    await user.click(screen.getByRole("button", { name: "View history" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(screen.getByText("Lifetime points").previousSibling).toHaveTextContent("0"));

    const pendingRegion = screen.getByRole("region", { name: "Pending promises" });
    expect(within(pendingRegion).getByText("I will read for 20 minutes")).toBeInTheDocument();
    expect(within(pendingRegion).getByRole("button", { name: "Kept it" })).toBeInTheDocument();
  });

  it("a rescheduled promise never creates a negative point total", async () => {
    const user = userEvent.setup();
    renderHarness();
    await waitFor(() => expect(screen.getByPlaceholderText("What will you do?")).toBeInTheDocument());

    await makePromise(user, "I will call a family member");
    await user.click(screen.getByRole("button", { name: /Reschedule:/ }));
    const dateInputs = screen.getAllByLabelText("New date");
    await user.clear(dateInputs[0]);
    await user.type(dateInputs[0], "2026-01-10");
    await user.click(screen.getByRole("button", { name: "Reschedule" }));

    expect(screen.getByText("Lifetime points").previousSibling).toHaveTextContent("0");
  });

  it("points survive a simulated refresh (a fresh provider re-reading localStorage)", async () => {
    const user = userEvent.setup();
    const first = renderHarness();
    await waitFor(() => expect(screen.getByPlaceholderText("What will you do?")).toBeInTheDocument());
    await makePromise(user, "I will finish my assignment");
    await user.click(screen.getByRole("button", { name: "Kept it" }));
    await waitFor(() => expect(screen.getByText("Lifetime points").previousSibling).toHaveTextContent("1"));

    first.unmount();

    renderHarness();
    await waitFor(() => expect(screen.getByPlaceholderText("What will you do?")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Lifetime points").previousSibling).toHaveTextContent("1"));

    await user.click(screen.getByRole("button", { name: "View history" }));
    expect(within(screen.getByText("I will finish my assignment").closest("li")!).getByText(/Kept/)).toBeInTheDocument();
  });
});
