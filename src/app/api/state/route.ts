import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/server/auth";
import { query, queryOne } from "@/server/db";
import { TrackerState } from "@/persistence/types";
import { isTrackerStateV6 } from "@/persistence/validate";

export const dynamic = "force-dynamic";

/*
  The whole vault, read and written as one document.

  Every write is validated with the same `isTrackerStateV6` the client uses
  before it reaches the table. The server is the last place that can refuse
  malformed data, and a rejected request leaves the previous document intact —
  which is the property the old localStorage repository worked hard to keep
  (write-then-verify, safety backups) and the one worth preserving here.
*/

async function guard(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const row = await queryOne<{ state: TrackerState; updated_at: string }>(
      "SELECT state, updated_at FROM vault WHERE id = 1"
    );
    if (!row) return NextResponse.json({ state: null });

    if (!isTrackerStateV6(row.state)) {
      // Readable row, unreadable contents. Say so rather than handing the app
      // something it will crash on — the document is left untouched for
      // inspection.
      return NextResponse.json({ error: "The stored data failed validation." }, { status: 422 });
    }
    return NextResponse.json({ state: row.state, updatedAt: row.updated_at });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const body = (await request.json()) as { state?: unknown };
    if (!isTrackerStateV6(body.state)) {
      return NextResponse.json({ error: "The submitted data failed validation." }, { status: 422 });
    }

    const state = body.state as TrackerState;
    const row = await queryOne<{ updated_at: string }>(
      `INSERT INTO vault (id, version, state, updated_at)
       VALUES (1, $1, $2, now())
       ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, state = EXCLUDED.state, updated_at = now()
       RETURNING updated_at`,
      [state.version, JSON.stringify(state)]
    );
    return NextResponse.json({ ok: true, updatedAt: row?.updated_at });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE() {
  const denied = await guard();
  if (denied) return denied;
  try {
    await query("DELETE FROM vault WHERE id = 1");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
