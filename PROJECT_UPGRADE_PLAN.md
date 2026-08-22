# Yawm Wahid — Upgrade Plan (v4 → v5)

## Repository as found

Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, Framer Motion, `lucide-react`. No backend, no test framework, no PWA manifest. `npm` (package-lock.json v3) is the package manager.

State: one `TrackerState` object (schema `version: 4`) written wholesale to `localStorage` on every change (`src/lib/TrackerContext.tsx`, `src/lib/storage.ts`). Habits are boolean-only, always-daily, grouped under three fixed pillars. Savings/debt are single running totals. Journal is a raw textarea bound directly to global state (rewrites entire blob per keystroke). Timers are interval-based with periodic flush-to-state. Password is a SHA-256 hash gate (correctly documented as a privacy screen, not encryption).

## Scope decisions (deviations from the literal spec, and why)

The request describes an ambitious v2-of-the-product. Implementing every clause literally (full IndexedDB layer, a service-worker-driven offline PWA with update flow, a complete translation-string i18n system, and a Playwright E2E suite) in one pass is more likely to destabilize a working single-user app than to help it. I'm implementing the full *behavioral* contract (the 30 acceptance criteria) and scoping the *infrastructure* choices that the spec itself marks as conditional:

- **Persistence stays on `localStorage`, hardened, not IndexedDB.** The spec says "if it can be introduced safely." A rewrite to IndexedDB is a large surface change to the one thing that must never lose data. Instead: a repository layer (`src/persistence/`) with atomic-ish writes (write-then-verify, safety backup before import, corrupted-JSON recovery, cross-tab sync via the `storage` event, debounced journal writes). This satisfies the durability/UX requirements without the migration risk.
- **PWA is minimal, not full offline-first with update banners and push.** I add `app/manifest.ts`, icons, theme colors, and a small cache-first service worker for the app shell (registered only in production, no notification permission requested). Web Push is explicitly out of scope (spec also says reminders must be optional and not requested on load — a push subscription flow is not needed to satisfy that).
- **i18n is "lite," not a full translation framework.** I add a `locale`/`currency` device setting, `Intl`-based date/number/currency formatting, and RTL layout support (the app already carries Arabic phrases natively). I do not translate every UI string into Arabic — that's a larger content project. This is called out as future work.
- **No E2E framework added.** Vitest + Testing Library covers unit and component-level acceptance criteria (promise points, migrations, import validation, keyboard interaction, autosave, timers). Adding Playwright plus browser binaries in this environment risks an unstable, un-runnable suite. Documented as recommended future work.

Everything else — Promises Kept, the flexible habit engine, supportive scoring with special days, the financial ledger, Today/Week/Journey views, timer reliability, accessibility, and the v4→v5 migration — is implemented for real, not stubbed.

## Target architecture

```
src/
  app/            routes: / (Today), /week, /journey, layout, manifest.ts, sw registration
  components/     presentational + feature UI (kept flat; existing components upgraded in place)
  domain/         pure functions: date, habits, commitments, finance, completion, analytics, specialDays
  persistence/    types (v5 schema), migrations/v4-to-v5, repository (localStorage), import-export
  providers/      TrackerProvider (composes domain + repository), split hooks per concern
  lib/            legacy re-exports kept temporarily where useful, sha256
  test/           vitest setup + domain/component tests
```

Business logic moves into `domain/` as pure, unit-tested functions. Components read through the provider, never touch `localStorage` directly. Analytics values are always derived, never stored.

## Data model v5 (superset of v4)

- `commitments: Commitment[]` — the Promises Kept ledger. Points are **always** `commitments.filter(c => c.status === "kept").length`, never a stored counter.
- `habitsByPillar` keeps its v4 shape (`Record<PillarId, Habit[]>`) but `Habit` gains `schedule`, `metric`, `level`, `activeFrom`, `archivedAt?`, `pausedUntil?`. Kept nested-under-pillar (not flattened with a `pillarId` field) because that's the existing storage shape and flattening it is unnecessary churn.
- `days[date]` gains `habitValues?` (count/duration/amount entries), `specialState?` (rest/sick/travel/recovery), `reflection?`, `meditationSeconds?`, `focusSeconds` (renamed from `deepWorkSeconds`, old key migrated).
- `money.transactions: MoneyTransaction[]` replaces the two running totals; `savingsGoal`/`startingDebt`/`currency` become configurable settings. Old totals become one opening `adjustment` transaction each, so history + derived totals reconcile exactly.
- `settings: { locale, currency, focusTargetMinutes, meditationDefaultMinutes }`.

Migration `migrateV4ToV5` is a pure function, guarded by `state.version`, deterministic, and idempotent (running it on already-v5 data is a no-op passthrough). v4 and v4-backup JSON remain importable; import validates fully before touching current state and only replaces it after a safety backup of the current state succeeds.

## Promise Points

Never stored as a counter. Always `commitments.filter(c => c.status === "kept").length`. Marking kept sets `status`, `keptAt`; undo resets to `pending` and clears `keptAt` — the point disappears because it's derived. Reschedule/cancel never touch other commitments' status, so they cannot remove unrelated points. Included in exports, migrations, and analytics.

## Verification

`npm run lint`, `npx tsc --noEmit`, `npm run test` (vitest), `npm run build` — run at the end, failures introduced by this change get fixed, pre-existing/out-of-scope issues documented separately.
