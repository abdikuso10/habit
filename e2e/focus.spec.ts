import { expect, test } from "@playwright/test";
import { createAccount, readState } from "./helpers";

/*
  The daily focus target is stored twice — on the deepWork habit, which is what
  the timer and day completion measure against, and in settings, which seeds
  targets for focus habits made later. The control used to write only the
  second, so the number in the box moved and the target it was supposed to set
  did not. These tests assert on both, and on what survives a reload.
*/
test.describe("focus target", () => {
  test("a preset sets the real daily target, not just the seed setting", async ({ page }) => {
    await createAccount(page);

    // Four hours is the seeded default, so a new account starts there.
    await expect(page.getByText("/ 04:00:00")).toBeVisible();

    await page.getByText("Change target").click();
    await page.getByRole("button", { name: "2h", exact: true }).click();
    await expect(page.getByText("/ 02:00:00")).toBeVisible();

    await page.getByRole("button", { name: "4h", exact: true }).click();
    await expect(page.getByText("/ 04:00:00")).toBeVisible();
    await expect(async () => {
      const s = await readState();
      const habit = s!.habitsByPillar.mind.find((h) => h.id === "deepWork")!;
      expect(habit.metric).toMatchObject({ type: "duration", targetMinutes: 240 });
      expect(s!.settings.focusTargetMinutes).toBe(240);
    }).toPass();

    // A reload keeps the session (httpOnly cookie), so no unlock here.
    await page.reload();
    await expect(page.getByText("/ 04:00:00")).toBeVisible();
  });

  test("a typed target is accepted too", async ({ page }) => {
    await createAccount(page);
    await page.getByText("Change target").click();

    const box = page.getByLabel("Daily focus target in minutes");
    await box.fill("200");
    await box.blur();

    await expect(page.getByText("/ 03:20:00")).toBeVisible();
    await expect(async () => {
      const s = await readState();
      const habit = s!.habitsByPillar.mind.find((h) => h.id === "deepWork")!;
      expect(habit.metric).toMatchObject({ type: "duration", targetMinutes: 200 });
    }).toPass();
  });
});
