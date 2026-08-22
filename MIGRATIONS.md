# Schema migrations

## v5 → v6 (this upgrade)

### Why

v5 knew *what* each habit was and *how often* it was asked for, but never
*when*. That matters more than it sounds: automaticity is built by repeating a
behaviour after a consistent cue, and forming an explicit when/where plan is
the best-evidenced single technique in the behaviour-change literature. v6
adds that missing half.

### What changed

| v5 | v6 |
|---|---|
| `Habit { …, pausedUntil? }` | `Habit` adds `cue?: HabitCue` |
| *(none)* | `HabitCue { anchor?, time?, place?, allDay? }` |

`anchor` is one of eight moments running through the day — `wake`, `fajr`,
`morning`, `dhuhr`, `asr`, `maghrib`, `isha`, `night`. The five prayers are the
backbone because they already happen, at fixed times, every day, which is
exactly what makes a cue work.

`allDay: true` is a deliberate "this habit has no trigger" — an abstention is
held across the whole day rather than started at a moment. It is stored
explicitly so the app can tell a decision apart from an unanswered question,
and never nags for a cue that shouldn't exist.

Nothing was removed or renamed, and `cue` is optional, so every v5 field
carries through untouched.

### Migration behavior (`src/persistence/migrations/v5-to-v6.ts`)

- **Deterministic and idempotent**, on the same terms as v4 → v5: no
  `Date.now()`, no `Math.random()`, and the repository only invokes it when
  `state.version === 5`.
- **Seeded habits get the cue that fits them.** Without this, an existing
  account would land on the new cue-based day view with every habit in one
  undifferentiated "All day" bucket, which is worse than what it replaced.
- **Seeded abstentions** (`noKhat`, `noShisha`, `noAlcohol`,
  `noImpulseSpending`, `water`) are marked `allDay: true`.
- **Habits the user created are left uncued on purpose.** We have no idea when
  they do those, and guessing would put a plan in their mouth they never made.
  The app prompts them to choose instead.
- **A cue that already exists is never overwritten.**

### Storage keys

`yawm-wahid:state:v6` is the current key; `yawm-wahid:state:v5` and
`yawm-wahid:state:v4` are read and migrated forward on load, and are left in
place rather than deleted. Backups exported from v4 and v5 are still
importable — they are migrated in memory and re-validated before they are ever
offered as something to import.

## v4 → v5 (previous upgrade)

### Why

v4 was boolean-habit-only, single-total savings/debt, no commitments, no
special days, no flexible scheduling. v5 adds Promises Kept, the flexible
habit engine, a financial transaction ledger, special day states, and
richer analytics, while keeping every v4 concept representable.

### What changed

| v4 | v5 |
|---|---|
| `HabitDef { id, label, jp? }`, implicitly daily/checkbox | `Habit { id, label, jp?, metric, schedule, level, activeFrom, archivedAt?, pausedUntil? }` |
| `savingsTotal: number` | `money.transactions: MoneyTransaction[]`, derived via `savingsTotal()` |
| `debtRemaining: number` | `settings.money.startingDebt` (opening balance) + ledger transactions, derived via `debtRemaining()` |
| *(none)* | `commitments: Commitment[]` — Promises Kept |
| `DayRecord { habits, journal, deepWorkSeconds? }` | `DayRecord` adds `habitValues?`, `journalFavorite?`, `journalUpdatedAt?`, `reflection?`, `focusSeconds?` (renamed from `deepWorkSeconds`), `meditationSeconds?`, `specialState?`, `intention?` |
| *(none)* | `settings: { locale, money, focusTargetMinutes, meditationDefaultMinutes }` |
| *(none)* | `timer: RunningTimerState | null` — timestamp-based, survives refresh |

### Migration behavior (`src/persistence/migrations/v4-to-v5.ts`)

- **Deterministic and idempotent.** The function takes no current
  timestamp/random input — it derives every synthetic id and date from the
  legacy data itself (e.g. `dayOneDate`), so running it twice on the same v4
  input produces byte-identical v5 output. The repository additionally only
  ever invokes it when `state.version === 4`, so a v5 record can never be
  re-migrated.
- **`passwordHash`, `dayOneDate` are copied unchanged** — the privacy-screen
  behavior is untouched.
- **Habits**: each `HabitDef` becomes a `Habit` with `schedule: "daily"`
  (matching v4's implicit behavior exactly) and `activeFrom: dayOneDate`.
  Level assignment for the known seed habits (prayers, gym, etc.) matches
  the current default seed list, so a migrated account reads the same as a
  fresh one for the habits they share. A user's own custom-added habits get
  a neutral `level: "target"` — there's no basis to guess minimum vs.
  stretch for those.
  - `deepWork` becomes a `duration` habit with `targetMinutes: 240` (the old
    4-hour target) — **preserved exactly for migrated accounts**, but new
    accounts get `settings.focusTargetMinutes` (90 by default) instead. Four
    hours is never forced as the new default.
  - `meditation` **stays a checkbox habit** deliberately. v4 never recorded
    session duration (only a boolean "done"), so there's no historical
    duration data to reconstruct — converting it to a duration metric would
    silently reinterpret every past day's meaning. (Its precise elapsed time
    going forward is still tracked separately, in `DayRecord.meditationSeconds`,
    for analytics — the *habit's* completion rule just doesn't depend on it.)
- **Days**: `habits` and `journal` are copied as-is. `deepWorkSeconds` (if
  present) is renamed to `focusSeconds` with the same value — the
  completion math it feeds is unchanged (`seconds >= 4h`).
- **Commitments**: starts as `[]` — an explicit empty history, not omitted.
- **Finance**: the two old totals become opening ledger entries that
  reconstruct them exactly:
  - If `savingsTotal > 0`, one `saving` transaction for that amount, dated
    `dayOneDate`.
  - `settings.money.startingDebt` is set to the v4 constant (98,000). If
    `debtRemaining < startingDebt`, one `debt-payment` transaction for the
    difference (what had already been paid) is created; if for any reason
    debt had grown (not possible via the v4 UI, but handled defensively),
    a `debt-increase` transaction covers the difference instead. Either way,
    `debtRemaining(transactions, startingDebt) === legacy.debtRemaining`
    exactly.
  - `savingsGoal` defaults to the v4 constant (1,000,000); `currency`
    defaults to `"KES"` (shillings, matching the original UI copy).
- **Nothing is silently dropped.** Every v4 field maps to something in v5;
  there were no unknown/extra fields to preserve.

### Backup compatibility

- **v4 backups remain importable.** `previewImport()` accepts a bare v4
  object (the old export format had no wrapper) and runs it through the same
  migration before validating the result as v5.
- **v5 backups** are validated directly. The export file also carries a
  small wrapper (`{ app, schemaVersion, exportedAt, state }`) with metadata
  used for the import summary; `previewImport()` accepts both the wrapped
  format and a bare state object either way.
- Import never partially applies: parsing and full structural validation
  happen before any write. Only after the user confirms a preview does the
  app snapshot current data, write, and verify — restoring the snapshot
  automatically if verification fails.

### Rollback / recovery

- Export a backup before upgrading if you want a point-in-time copy outside
  the app.
- If a v5 install ever needs to go back to reading v4 data directly, that
  data is never deleted by this migration — the original `yawm-wahid:state:v4`
  key is left in place after migration (only the new `yawm-wahid:state:v5`
  key is written), so it remains available for manual inspection or export
  via devtools if ever needed.
- If stored v5 data becomes unreadable (corrupted JSON, failed validation),
  the app does not delete it — it's preserved under a timestamped
  `yawm-wahid:corrupted:<timestamp>` key, and the app offers a
  restore-from-backup path instead of starting over silently.
