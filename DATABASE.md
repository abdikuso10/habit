# Database setup

The app stores everything in Postgres. There is no local copy — see
[Tradeoffs](#tradeoffs).

## What's stored

Two tables, both pinned to a single row (`CHECK (id = 1)`), because the app has
one user by design:

| Table | Holds |
|---|---|
| `vault` | the whole `TrackerState` as one `jsonb` document, plus `version` and `updated_at` |
| `credential` | the scrypt password hash, its salt, and the session-signing secret |

The full schema is `src/server/schema.sql`.

Storing state as one JSON document rather than normalised tables is deliberate:
every function in `src/domain/` already takes a whole `TrackerState`, and the
v4→v5→v6 migrations and `validate.ts` are built around that shape. Normalising
would mean rewriting the layer that must never lose data, to gain SQL queries a
single user doesn't run.

## Production: Neon on Vercel

1. In your Vercel project, open **Storage → Create Database → Neon**, and
   connect it to the project. Vercel sets `DATABASE_URL` for you.
2. Apply the schema once, from your machine, against the Neon connection
   string. Copy it from the Neon dashboard (or `vercel env pull`):

   ```sh
   DATABASE_URL='postgresql://…neon.tech/…?sslmode=require' node scripts/db-setup.mjs
   ```

   It's safe to re-run — every statement is `IF NOT EXISTS`.
3. Deploy. On first visit the app shows its setup screen; the password you
   choose there is hashed with scrypt and stored in `credential`.

`src/server/db.ts` picks Neon's serverless driver when the connection string
points at `neon.tech`, and plain `pg` otherwise, so local development runs the
same SQL as production.

## Local development

Requires a running Postgres.

```sh
createdb habit_dev
echo 'DATABASE_URL=postgresql://localhost:5432/habit_dev' > .env.local
node --env-file=.env.local scripts/db-setup.mjs
npm run dev
```

`.env*` is gitignored, so no connection string is ever committed.

## Tests

End-to-end tests use their own database and run serially, truncating between
tests — two tests setting up at once would fight over the same single row.

```sh
createdb habit_e2e
E2E_DATABASE_URL=postgresql://localhost:5432/habit_e2e node scripts/db-setup.mjs
npm run e2e
```

Unit and component tests need no database: `src/test/setup.ts` serves the four
API routes from memory, so they still drive the real provider and the real
transport.

## API

Every route is dynamic and gated on a session cookie except where noted.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/session` | GET | whether a vault exists and whether this request is signed in (ungated) |
| `/api/auth/setup` | POST | first-run only; creates the credential and signs you in |
| `/api/auth/login` | POST | verifies the password, sets the session cookie |
| `/api/auth/logout` | POST | clears the cookie |
| `/api/state` | GET / PUT / DELETE | read, replace, or clear the vault |

Writes are validated on the server with the same `isTrackerStateV6` the client
uses. A rejected write leaves the stored document untouched.

## Tradeoffs

- **No offline.** The database is the only copy, so the app needs a connection
  to open or save. A failed write shows an "Unsaved" badge in the header and
  retries with backoff; closing the tab while it's showing loses that change.
- **A session survives reloads.** The cookie is httpOnly and lasts 30 days.
  Reloading no longer asks for the password — **Lock** ends the session
  explicitly.
- **Back up anyway.** Settings → Backup exports a JSON file. One database is
  one thing to lose.

## Security notes

- The password is hashed with scrypt and a per-install salt, verified
  server-side. The old SHA-256 check ran in the browser and, as its own source
  file said, was a privacy screen rather than a control.
- Session tokens are HMAC-signed with a secret in `credential.session_secret`.
  Rotating that row invalidates every issued cookie at once.
- **The vault itself is not encrypted at rest.** Anyone with the connection
  string — and Neon and Vercel operators — can read your journal, habits, and
  ledger. That is a change from the previous device-only storage, and it is the
  cost of syncing across devices.
