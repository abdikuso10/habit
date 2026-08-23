// Applies src/server/schema.sql. Safe to re-run: every statement is IF NOT EXISTS.
//   node --env-file=.env.local scripts/db-setup.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

// Either name works, matching src/server/db.ts: Vercel's Neon integration sets
// DATABASE_URL, Vercel Postgres sets POSTGRES_URL. The unpooled variants are
// tried first because this applies DDL, and a transaction pooler is the wrong
// place to run schema changes through. Locally only DATABASE_URL is set, so the
// list collapses to the same value it always used.
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;
if (!url) {
  console.error("No connection string. Set DATABASE_URL (or POSTGRES_URL) via --env-file or the environment.");
  process.exit(1);
}

const sql = readFileSync(new URL("../src/server/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl: /neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: true } : undefined,
});

await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('vault', 'credential')
     ORDER BY table_name`
  );
  console.log("Schema applied. Tables:", rows.map((r) => r.table_name).join(", "));
} finally {
  await client.end();
}
