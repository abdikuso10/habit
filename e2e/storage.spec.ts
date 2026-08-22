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
