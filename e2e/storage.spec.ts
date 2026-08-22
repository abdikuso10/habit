import { expect, test } from "@playwright/test";
import pg from "pg";
import { createAccount } from "./helpers";

const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://localhost:5432/habit_e2e";

/*
  Two failures look identical from the browser — "I asked for the vault and
  didn't get it" — but mean opposite things to the user. A document that fails
  validation needs a backup restored; an unreachable server needs a network.
  The API separates them with a 422, and this pins that the separation survives
  all the way to the screen the user actually sees.
*/
test("a stored document that fails validation shows the corrupted screen, not a connection error", async ({
  page,
}) => {
  await createAccount(page);

  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`UPDATE vault SET state = '{"version":6,"garbage":true}'::jsonb WHERE id = 1`);
  } finally {
    await client.end();
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: /couldn't be read/i })).toBeVisible();
  await expect(page.getByText(/check your network/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore from backup" })).toBeVisible();
});

/*
  A read that fails once is not the same as data that is gone.

  The first version of this gave up after a single failed request, so one
  dropped packet — or a dev-server hot reload landing mid-request — pinned the
  app on an error screen until the user thought to reload, while the data sat
  in Postgres untouched. These two cases pin the recovery: silent when the
  failure is transient, and recoverable in place when it isn't.
*/
test("a transient failure at load recovers by itself", async ({ page }) => {
  await createAccount(page);

  let failures = 0;
  await page.route("**/api/auth/session", async (route) => {
    if (failures < 2) {
      failures += 1;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeVisible({ timeout: 15_000 });
  expect(failures).toBe(2);
});

test("a permanent failure shows the screen, and Try again recovers without a reload", async ({ page }) => {
  await createAccount(page);

  let blocking = true;
  await page.route("**/api/auth/session", async (route) => {
    if (blocking) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: /Can't reach your data/i })).toBeVisible({ timeout: 20_000 });

  blocking = false;
  await page.getByRole("button", { name: /Try again|Trying/ }).click();
  await expect(page.getByRole("heading", { name: /Day \d+ of \d+/ })).toBeVisible({ timeout: 15_000 });
});
