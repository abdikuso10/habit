-- Yawm Wahid — single-user schema.
--
-- The whole TrackerState is stored as one JSONB document rather than spread
-- across normalised tables. Every function in src/domain/ already takes a
-- whole TrackerState, and the v4->v5->v6 migrations and validate.ts are built
-- around that shape, so normalising here would mean rewriting the layer that
-- must never lose data in exchange for SQL queries a single user does not run.
--
-- Both tables are pinned to a single row by a CHECK on a fixed id. This app
-- has one user by design; a stray INSERT should fail loudly rather than
-- quietly create a second vault that the app would then never read.

-- `state` is jsonb rather than json: it is validated on write, indexable, and
-- cheaper to read. The tradeoff is that jsonb normalises the document — key
-- order is not preserved and duplicate keys collapse — so a round-trip is
-- deep-equal but not byte-identical. Nothing here reads the vault by key
-- order, so that is a fair trade; if an exact-bytes export is ever needed,
-- that is a reason to keep the client's own JSON export, not to switch to json.
CREATE TABLE IF NOT EXISTS vault (
  id          integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Schema version of the document, mirrored out of the JSON so a migration
  -- can find rows to upgrade without parsing every document.
  version     integer     NOT NULL,
  state       jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credential (
  id             integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- scrypt(password, salt) — never the password, never a bare SHA-256.
  password_hash  text        NOT NULL,
  salt           text        NOT NULL,
  -- Rotating this invalidates every issued session cookie at once, which is
  -- what "log out everywhere" and a password change both need.
  session_secret text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
