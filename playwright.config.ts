import { defineConfig, devices } from "@playwright/test";

/*
  End-to-end tests run against a real production build, because several of the
  things worth testing here only exist there: the service worker registers in
  production only, and every route is prerendered static.

  Each test starts from a genuinely empty browser profile and drives the real
  first-run flow — set a password, pick a start date, land on Today. That's the
  same path a new user takes.

  Tests run serially against their own database. The app is single-user by
  design: the vault and credential tables are pinned to one row each, so two
  tests setting up at once would fight over the same row rather than isolating
  the way separate browser profiles used to. One worker plus a truncate between
  tests is the honest way to test a single-user app, and it removes the
  parallel-load flake the suite had when contexts were the only isolation.
*/
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://localhost:5432/habit_e2e";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    // Mobile first, because that's what this app is designed for.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npx next start --port 3100",
    env: { DATABASE_URL: E2E_DATABASE_URL },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
