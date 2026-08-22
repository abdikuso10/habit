import "server-only";

import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import ws from "ws";

/*
  One query interface, two drivers.

  On Vercel, Neon's serverless driver is the right one: it reaches the database
  over a WebSocket/HTTP path built for functions that start cold and run once,
  rather than holding a TCP pool that outlives the invocation. Locally, that
  driver cannot talk to a plain Postgres, so `pg` is used instead. Both expose
  the same `query` shape, so nothing above this module knows which is in play —
  and local development exercises the same SQL that production runs.
*/

const url = process.env.DATABASE_URL;

function connectionString(): string {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in Vercel (Storage -> your Neon database) or to .env.local for local development."
    );
  }
  return url;
}

const isNeon = () => /neon\.tech/.test(connectionString());

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

/*
  Cached on globalThis rather than a module constant: in development the module
  graph is re-evaluated on every hot reload, and a fresh pool per reload leaks
  connections until the database refuses new ones.
*/
const globalForDb = globalThis as unknown as { __habitPool?: Queryable };

function pool(): Queryable {
  if (globalForDb.__habitPool) return globalForDb.__habitPool;

  const created = isNeon()
    ? (() => {
        // The Neon driver needs a WebSocket implementation in Node runtimes.
        neonConfig.webSocketConstructor = ws;
        return new NeonPool({ connectionString: connectionString() }) as unknown as Queryable;
      })()
    : (new pg.Pool({
        connectionString: connectionString(),
        ssl: /sslmode=require/.test(connectionString()) ? { rejectUnauthorized: true } : undefined,
      }) as unknown as Queryable);

  globalForDb.__habitPool = created;
  return created;
}

/** Parameterised query. Values are always bound, never interpolated. */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool().query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
