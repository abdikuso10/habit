# Yawm Wahid — يوم واحد (Day One)

A private, offline-first, mobile-first personal growth system for one person.
It exists to help you keep promises to yourself, build realistic habits,
recover after a hard day, reflect on progress, and protect your own data —
without shame, punishment, or manipulative engagement mechanics. There is no
backend, no account, and no analytics or telemetry of any kind. Everything
lives in your browser's `localStorage`. Back up your data yourself with the
export/import tools in the app.

## What it does

- **Cues, not just checkboxes.** Every habit can be anchored to a moment that
  already happens — after Fajr, in the morning, after Asr, before sleep — and
  the daily screen is laid out as that timeline rather than as a list of
  categories. This is the part that makes a habit stick: automaticity is built
  by repeating a behaviour after a *consistent* cue, and committing to a
  specific when/where in advance is the best-evidenced technique in the
  behaviour-change literature. Habits that genuinely have no trigger (an
  all-day abstention) are marked as such, so the app never asks them for one.
- **Habit strength, not just a completion percentage.** A percentage tells you
  how compliant you have been. It doesn't tell you whether the behaviour is
  becoming automatic, which is the thing you are actually trying to buy. Each
  habit is placed on the habit-formation curve from its record of
  context-consistent repetitions — see **Honesty about the model** below.
- **"Never miss twice."** A streak counter is a loss-aversion device: it works
  until it breaks, and then it hurts. The evidence says a single missed
  opportunity does not measurably affect habit formation — two in a row is
  where the cue-behaviour pairing starts to come apart. So the app never
  reports a broken streak. It stays quiet on a steady day, and on the day
  after a miss it says the one thing worth saying.
- **Insights that are actions.** Analytics say what happened; these say what to
  do next — which habit to protect today, which one is scheduled more often
  than you are keeping it, which one still has no cue — ranked by how much
  difference acting would make.
- **Promises Kept ("My Word")** — say what you'll do ("I will…"), and when
  you keep it, you earn one Promise Point. Points are always calculated from
  the number of commitments currently marked `kept` — never a counter that
  can drift, and never negative. Undo, reschedule, and cancel are all
  supported without ever punishing you or removing an unrelated point.
- **A flexible habit engine** — habits can be checkboxes, counts, durations,
  or amounts with a unit; scheduled daily, on weekdays, on specific days, or
  a number of times per week; and leveled as minimum / target / stretch.
  Archiving or pausing a habit never rewrites its historical meaning, and
  only habits actually scheduled for a day count toward that day's
  completion.
- **Supportive daily scoring** — minimum/target/stretch tiers instead of a
  single win-or-lose number, plus rest/sick/travel/recovery day states that
  are excused rather than scored as missed. Streaks are shown as optional
  motivation, not the main judgment.
- **Today, Week, and Journey views** — each screen has one job. Today is for
  acting: the shape of the day, the habits themselves, promises, and a place
  to write. Week is for settling up: pillar balance, weekly reflection,
  promise history, and the money ledger. Journey is for understanding: the
  year grid, insights, habit strength, analytics, and milestones. Nothing that
  answers "how have I been doing?" sits on the screen you open every morning.
- **Focus and meditation timers** — timestamp-based, so elapsed time survives
  refresh, tab switches, and backgrounding. Targets are configurable; four
  hours is not a forced default.
- **A financial ledger** — savings and debt are derived from a transaction
  history (saving, withdrawal, debt payment, debt increase, adjustment), not
  a running total that can drift. Goal, starting debt, and currency are
  configurable.
- **A private, honest lock screen** — the app hashes your password
  (SHA-256) and stores only the hash. This is a **privacy/device-lock
  screen, not encryption**: the rest of your data is stored unencrypted in
  `localStorage`, and anyone with access to this device's browser storage or
  devtools can read it or bypass the lock. It exists to keep this journal
  from being read at a glance, not to protect against a determined attacker.
- **Backup and restore** — export includes your full state, schema version,
  and export timestamp. Import previews and fully validates a file before
  touching anything; your current data is snapshotted first and only
  replaced once the import is verified, so a bad or invalid file can never
  partially damage what you already have.

## Local development

Requires Node.js 20+ and npm (this repo uses `package-lock.json`).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first run you'll be
asked to set a password and pick your Day One date.

Other useful commands:

```bash
npm run build       # production build
npm run start       # run the production build locally
npm run lint         # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest (unit + component tests), single run
npm run test:watch  # vitest in watch mode
npm run e2e         # playwright (real browser, mobile + desktop)
npm run e2e:ui      # playwright in UI mode
```

## Honesty about the habit-strength model

The habit-strength figure is a **projection, not a measurement**, and the app
says so on the screen where it appears.

Real automaticity is assessed by self-report — the four-item SRBAI, "something
I do without thinking". This app never asks you to rate anything, so it has no
such measurement. What it has is your record of context-consistent
repetitions, which it places on the asymptotic curve from Lally et al. (2010),
*How are habits formed: Modelling habit formation in the real world*
(European Journal of Social Psychology 40, 998–1009). In that study the median
time to reach 95% of automaticity was 66 days — but individual results ranged
from 18 to 254 days, so the number is a direction of travel, not a deadline.

Two other findings from the same work shape behaviour elsewhere in the app:
performing the behaviour more consistently predicted a better-fitting curve
(so repetitions are discounted by consistency), and missing a single
opportunity did not materially affect the trajectory (so nothing here punishes
one missed day).

The cue anchors are approximated from the local clock, not from calculated
prayer times. Real prayer times need a location and a calculation method, and
fetching them would break the promise that this app never talks to a network.
The approximation is used only to highlight where you are in the day — nothing
is scored or scheduled from it.

## Data & privacy model

- All app data lives in `localStorage` under a single versioned key
  (`yawm-wahid:state:v6`). There is no server, so nothing ever leaves your
  device unless you export a backup file yourself.
- Dates are local calendar dates keyed as `YYYY-MM-DD`, computed from
  `Date.getFullYear/getMonth/getDate()` — never `toISOString()` — so "today"
  always matches your wall clock regardless of time zone.
- Before any import replaces your data, the app validates the file
  completely, shows you a summary (day one date, days tracked, habit count,
  promise points, transaction count) for confirmation, snapshots your
  current state, writes the import, and reads it back to verify it before
  discarding the snapshot. If verification fails at any step, your original
  data is restored automatically and nothing is lost.
- If the stored data can't be parsed at all (e.g. corrupted `localStorage`),
  the app never deletes it — the unreadable data is preserved under a
  timestamped key, and you're offered a backup-restore path to get going
  again.

See [`MIGRATIONS.md`](./MIGRATIONS.md) for the full v4 → v5 → v6 schema
migration story, and exactly what's preserved.

## Testing

```bash
npm run test        # unit + component
npm run e2e         # real browser, mobile + desktop
```

**Vitest + React Testing Library** for the domain and components. Coverage
includes: local-date math (leap years, month/year boundaries), habit
scheduling and completion across all metric types, streaks (including
special-day handling), the full Promises Kept lifecycle (create → keep →
exactly one point → undo → reschedule never goes negative → survives a
simulated refresh) exercised against the real provider and `localStorage` —
not mocks, the v4 → v5 and v5 → v6 migrations (deterministic and idempotent),
malformed-import rejection, keyboard habit completion, debounced journal
autosave, and accessible dialog behavior (Escape/close, labelling).

The behavioural engine added in v6 is tested as its own layer: the shape of
the habit-formation curve (calibrated so 66 consistent repetitions reach 95%,
monotonic, flattening, never NaN on an empty or inverted window), consecutive-
miss detection including the cases that must *not* count — today, excused
days, unscheduled days, and days before the account had any history — cue
formatting and its refusal to force a noun label into a verb slot, and the
insight ranking, deduplication and tone.

**Playwright** for full journeys through a real browser, on a mobile and a
desktop viewport, against a production build: first-run setup, the lock screen
rejecting and accepting a password, a ticked habit surviving a reload and
re-unlock, the day arc updating as habits are kept, keyboard-only completion,
a promise earning exactly one point and undo taking it back, navigation
without re-unlocking, the never-miss-twice banner appearing only when it
should, and the app opening offline from cache.

## Deploying to Vercel

This is a static, backend-free Next.js app. `npm run build` prerenders every
route (`/`, `/week`, `/journey`) as static content, so deployment is
zero-config:

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo, or run
   `npx vercel` from this directory and follow the prompts.
3. No environment variables or build settings are required.

Because all data lives in the browser, each device/browser you open the
deployed app in starts fresh — use **Export backup** / **Import backup** to
carry your progress between them. The app also installs as a PWA (web app
manifest + a minimal app-shell service worker registered in production) and
opens offline; it never prompts for notification permission.

One caveat the E2E suite made concrete: the service worker installs on your
first visit but doesn't control that page load, so the assets it fetched were
never cached. The app reliably opens offline from the **second** visit
onwards, not the first.

## Known limitations

Deliberate scope decisions, documented rather than silently skipped:

- **Persistence is hardened `localStorage`, not IndexedDB.** A repository
  layer adds safety-backup-before-import, corrupted-data recovery, and
  debounced writes, but the underlying store is still `localStorage`.
- **PWA support is minimal.** Manifest, icons, and a cache-first app-shell
  service worker with an update-available banner are included; there is no
  push-notification flow (by design — reminders must stay opt-in and are not
  implemented in this pass).
- **i18n is "lite."** Locale (English/Arabic), currency, and RTL layout are
  supported and toggleable from Settings, with locale-aware number/date
  formatting — but not every UI string is translated into Arabic yet. Numeric
  displays (timers, stats) are deliberately kept left-to-right even in RTL
  mode, since mechanically mirroring a figure like "42%" would misread it.
- **Cue anchors are clock-approximate, not calculated prayer times.** See
  **Honesty about the habit-strength model** above for why, and for what the
  approximation is and isn't used for.
- **Habit strength is a projection, not a measured automaticity score.** Also
  covered above. It is a coaching signal about trajectory; treating it as a
  psychometric result would be reading more into it than it can carry.
- **The E2E suite doesn't cover multi-tab sync.** Cross-tab `storage`-event
  syncing is implemented and works, but driving two tabs against one origin
  is left as future work; everything else in the user journey is covered.
- **Pre-existing, out-of-scope dependency advisories.** `npm audit` reports
  advisories in transitive dependencies pulled in by Next.js itself (postcss,
  sharp, brace-expansion) unrelated to this upgrade; fixing them would mean
  force-upgrading Next.js outside its current range, which wasn't part of
  this change.
