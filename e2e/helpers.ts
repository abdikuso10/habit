import { Page, expect } from "@playwright/test";
import pg from "pg";
import type { TrackerState } from "../src/persistence/types";

const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://localhost:5432/habit_e2e";

/**
 * Empties the vault so a test can drive the real first-run flow.
 *
 * The app stores one user in one row by design, so there is no per-test
 * isolation to be had from separate browser contexts any more — the database
 * is the shared thing, and it has to be reset between tests instead.
 */
export async function resetDatabase() {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query("TRUNCATE vault, credential");
  } finally {
    await client.end();
  }
}

export const PASSWORD = "test-pass";

/**
 * Waits until React has hydrated the page.
 *
 * Every route here is prerendered static, so the server HTML and the
 * pre-hydration DOM are identical — there is no visible signal that the app
 * has become interactive. Typing into a controlled input before hydration
 * looks like it works and then silently loses the value when React attaches,
 * which is exactly the kind of flake that makes people distrust E2E suites.
 * React tags each hydrated DOM node with a `__reactFiber$…` property, so that
 * is the signal we wait on.
 */
export async function waitForHydration(page: Page, selector = "#password") {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return Boolean(el && Object.keys(el).some((k) => k.startsWith("__reactFiber$")));
  }, selector);
}

/**
 * Fills a controlled input and confirms the value survived.
 *
 * Waiting for hydration gets us most of the way, but React can still re-render
 * immediately afterwards and reset a controlled input whose value was set
 * before its handler was live. That produced a test that passed alone and
 * failed four-at-a-time, which is the worst kind of flake. Filling and then
 * asserting the value — retrying the pair — removes the race rather than
 * papering over it with a sleep.
 */
export async function fillStable(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await expect(async () => {
    await field.fill(value);
    // Generous inner timeout: with several workers driving one server, a
    // controlled re-render can land well after the keystroke. Too tight a
    // window here just re-fills in a loop and reports a timeout that looks
    // like an app fault rather than machine load.
    await expect(field).toHaveValue(value, { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

/** Drives the real first-run flow: set a password, pick a start date, land on
 * Today. There is no backend to seed, so this is the only way in. */
export async function createAccount(page: Page, dayOneDate = "2026-01-01") {
  await resetDatabase();
  await page.goto("/");
  await waitForHydration(page);
  await fillStable(page, "#password", PASSWORD);
  await fillStable(page, "#confirm", PASSWORD);
  await fillStable(page, "#dayOne", dayOneDate);
  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeVisible();
}

/**
 * Enters the password on the lock screen.
 *
 * Used after an explicit Lock, which ends the server session. A plain reload
 * no longer lands here — see `reloadAndUnlock`.
 */
export async function unlock(page: Page, password = PASSWORD) {
  await waitForHydration(page, "#unlock-password");
  await fillStable(page, "#unlock-password", password);
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeVisible();
}

/**
 * Reload and land back in the app.
 *
 * This used to go through the lock screen, because the unlocked flag lived in
 * memory and every load started locked. The session is now a real httpOnly
 * cookie the server issues, so a reload stays signed in — the same as any other
 * site you are logged into. Locking is now an explicit act that ends the
 * session, which is what `unlock` covers.
 */
export async function reloadAndUnlock(page: Page) {
  await page.reload();
  await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeVisible();
}

/** Reads the persisted state straight out of Postgres, so tests assert on what
 * was actually stored rather than only on what's rendered. */
export async function readState(): Promise<TrackerState | null> {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT state FROM vault WHERE id = 1");
    return (rows[0]?.state as TrackerState) ?? null;
  } finally {
    await client.end();
  }
}

/**
 * Rewrites persisted state to set up a scenario that would otherwise take
 * days of real time to reach — a missed day, a long history.
 *
 * The rewrite now happens in Postgres rather than in the page, so `mutate`
 * runs here in Node and no longer has to be serialisable. The reload afterwards
 * is what makes the app pick the new document up.
 */
export async function seedState(page: Page, mutate: (state: TrackerState) => TrackerState) {
  const current = await readState();
  if (!current) throw new Error("no state to seed");
  const next = mutate(current);

  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query("UPDATE vault SET state = $1, version = $2, updated_at = now() WHERE id = 1", [
      JSON.stringify(next),
      next.version,
    ]);
  } finally {
    await client.end();
  }

  await reloadAndUnlock(page);
}
