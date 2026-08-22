import { Page, expect, test } from "@playwright/test";
import {
  PASSWORD,
  createAccount,
  fillStable,
  readState,
  reloadAndUnlock,
  resetDatabase,
  seedState,
  waitForHydration,
} from "./helpers";

/*
  Full user journeys through a real browser. These cover the things unit and
  component tests structurally cannot: first-run setup, the lock screen, data
  actually surviving a reload, and cross-page navigation.
*/

test.describe("first run", () => {
  test("takes a new user from setup to a usable day", async ({ page }) => {
    await createAccount(page);

    // The day arc is the first thing on the screen.
    await expect(page.getByRole("heading", { name: "The shape of today" })).toBeAttached();
    // And the habits are laid out by cue, not by pillar.
    await expect(page.getByRole("heading", { name: "After Fajr" })).toBeVisible();
  });

  test("refuses a password that doesn't match its confirmation", async ({ page }) => {
    // Tests share one database now, so a test that doesn't go through
    // createAccount has to clear it itself or it starts on a lock screen.
    await resetDatabase();
    await page.goto("/");
    await waitForHydration(page);
    await fillStable(page, "#password", PASSWORD);
    await fillStable(page, "#confirm", "something-else");
    await fillStable(page, "#dayOne", "2026-01-01");
    await page.getByRole("button", { name: "Begin" }).click();
    // Scoped to the form's own message: Next's route announcer is also
    // role="alert", so an unscoped query matches two elements.
    await expect(page.getByText("Passwords don't match.")).toBeVisible();
    // Nothing was written for a rejected setup.
    expect(await readState()).toBeNull();
  });
});

test.describe("locking", () => {
  test("locks, rejects a wrong password, and reopens with the right one", async ({ page }) => {
    await createAccount(page);
    await page.getByRole("button", { name: "Lock" }).click();

    const passwordField = page.locator("input[type=password]").first();
    await expect(passwordField).toBeVisible();

    await fillStable(page, "input[type=password]", "wrong-password");
    await page.getByRole("button", { name: /unlock|enter/i }).click();
    // Wait for the rejection to land before retrying: the check is a round
    // trip now, and it clears the field when it answers.
    await expect(page.getByText("That password doesn't match.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeHidden();

    await fillStable(page, "input[type=password]", PASSWORD);
    await page.getByRole("button", { name: /unlock|enter/i }).click();
    await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeVisible();
  });
});

test.describe("recording a day", () => {
  // The real <input> is visually hidden behind a styled indicator, so a user
  // ticks a habit by clicking its label. Clicking the label is what the test
  // does too, rather than forcing a click on the hidden input.
  const habitLabel = (page: Page, id: string) => page.locator(`label[for="${id}"]`);

  test("a ticked habit survives a full page reload", async ({ page }) => {
    await createAccount(page);

    await habitLabel(page, "fajr").click();
    await expect(page.getByRole("checkbox", { name: /Fajr on time/ })).toBeChecked();

    await reloadAndUnlock(page);
    await expect(page.getByRole("checkbox", { name: /Fajr on time/ })).toBeChecked();
  });

  test("ticking a habit moves the day arc for that anchor", async ({ page }) => {
    await createAccount(page);
    const fajrLink = page.getByRole("link", { name: /After Fajr/ });
    await expect(fajrLink).toContainText("0/2");
    await habitLabel(page, "fajr").click();
    await expect(fajrLink).toContainText("1/2");
  });

  test("a habit can be reached and ticked with the keyboard alone", async ({ page }) => {
    await createAccount(page);
    const fajr = page.getByRole("checkbox", { name: /Fajr on time/ });
    await fajr.focus();
    await page.keyboard.press("Space");
    await expect(fajr).toBeChecked();
  });
});

test.describe("promises", () => {
  test("keeping a promise earns exactly one point, and undo takes it back", async ({ page }) => {
    await createAccount(page);

    await fillStable(page, '[placeholder="What will you do?"]', "I will call home");
    await page.getByRole("button", { name: "Make the promise" }).click();
    // exact, because the polite live-region announcement ("Promise made: …")
    // also contains this text — which is a good thing, not a bug.
    await expect(page.getByText("I will call home", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Kept it" }).first().click();
    expect((await readState())?.commitments.filter((c) => c.status === "kept")).toHaveLength(1);

    // Promise history lives on the Week screen — Today is for the day itself —
    // and it stays collapsed until you ask for it.
    await page.getByRole("link", { name: "Week" }).click();
    await page.getByRole("button", { name: "View history" }).click();
    await page.getByRole("button", { name: "Undo" }).first().click();
    expect((await readState())?.commitments.filter((c) => c.status === "kept")).toHaveLength(0);
  });

  test("a promise point is derived, so it survives a reload without drifting", async ({ page }) => {
    await createAccount(page);
    await fillStable(page, '[placeholder="What will you do?"]', "I will call home");
    await page.getByRole("button", { name: "Make the promise" }).click();
    await page.getByRole("button", { name: "Kept it" }).first().click();

    await page.reload();
    await page.reload();
    expect((await readState())?.commitments.filter((c) => c.status === "kept")).toHaveLength(1);

  });
});

test.describe("navigation", () => {
  test("moves between Today, Week and Journey without asking to unlock again", async ({ page }) => {
    await createAccount(page);

    await page.getByRole("link", { name: "Week" }).click();
    await expect(page).toHaveURL(/\/week$/);
    await expect(page.locator("input[type=password]")).toHaveCount(0);

    await page.getByRole("link", { name: "Journey" }).click();
    await expect(page).toHaveURL(/\/journey$/);
    await expect(page.locator("input[type=password]")).toHaveCount(0);

    await page.getByRole("link", { name: "Today" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("never miss twice", () => {
  test("surfaces the recovery banner after a missed day, and not before", async ({ page }) => {
    await createAccount(page);
    await expect(page.getByRole("heading", { name: "Never miss twice" })).toBeHidden();

    // Yesterday recorded, with nothing done.
    await seedState(page, (state) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const key = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
        yesterday.getDate()
      ).padStart(2, "0")}`;
      state.days[key] = { habits: {}, journal: "" };
      return state;
    });

    await expect(page.getByRole("heading", { name: /Never miss twice|Rebuilding/ })).toBeVisible();
  });
});
