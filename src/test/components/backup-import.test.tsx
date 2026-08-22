import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { BackupTools } from "@/components/BackupTools";
import { createInitialState } from "@/persistence/factory";
import { buildExportPayload } from "@/persistence/importExport";
import { TrackerProvider, useTracker } from "@/providers/TrackerProvider";

const PASSWORD = "pw";

function Harness() {
  const { loadStatus, isUnlocked, createAccount, unlock } = useTracker();
  useEffect(() => {
    if (loadStatus === "empty") createAccount(PASSWORD, "2026-01-01");
    if (loadStatus === "ready" && !isUnlocked) unlock(PASSWORD);
  }, [loadStatus, isUnlocked, createAccount, unlock]);
  if (loadStatus !== "ready" || !isUnlocked) return <p>loading</p>;
  return <BackupTools />;
}

function validBackupFile(): File {
  const state = createInitialState("some-other-hash", "2025-06-01");
  const payload = buildExportPayload(state, "2026-03-01T00:00:00.000Z");
  return new File([JSON.stringify(payload)], "backup.json", { type: "application/json" });
}

describe("Backup import — preview and confirm", () => {
  it("previews a valid backup before touching current data, and only replaces it on explicit confirm", async () => {
    const user = userEvent.setup();
    render(
      <TrackerProvider>
        <Harness />
      </TrackerProvider>
    );

    const fileInput = await screen.findByTestId("backup-file-input");
    await user.upload(fileInput, validBackupFile());

    // A confirmation dialog with a summary appears; nothing has been replaced yet.
    expect(await screen.findByRole("dialog", { name: "Confirm import" })).toBeInTheDocument();
    expect(screen.getByText("2025-06-01")).toBeInTheDocument();
    expect(screen.queryByText("Backup restored.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Replace my data" }));

    await waitFor(() => expect(screen.getByText("Backup restored.")).toBeInTheDocument());
  });

  it("rejects a malformed file without opening a confirmation dialog", async () => {
    const user = userEvent.setup();
    render(
      <TrackerProvider>
        <Harness />
      </TrackerProvider>
    );

    const fileInput = await screen.findByTestId("backup-file-input");
    const badFile = new File(["not json at all"], "bad.json", { type: "application/json" });
    await user.upload(fileInput, badFile);

    expect(await screen.findByRole("alert")).toHaveTextContent("isn't valid JSON");
    expect(screen.queryByRole("dialog", { name: "Confirm import" })).not.toBeInTheDocument();
  });
});
