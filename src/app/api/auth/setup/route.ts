import { NextRequest, NextResponse } from "next/server";
import { hashPassword, newSalt, newSessionSecret, setSessionCookie } from "@/server/auth";
import { query, queryOne } from "@/server/db";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

/*
  First-run only. Guarded by an INSERT that can only succeed when no credential
  row exists — checking first and inserting after would leave a window where two
  concurrent requests both pass the check, and the second would silently take
  over the vault.
*/
export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: unknown };
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const salt = newSalt();
    const sessionSecret = newSessionSecret();
    const passwordHash = await hashPassword(password, salt);

    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO credential (id, password_hash, salt, session_secret)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [passwordHash, salt, sessionSecret]
    );

    if (!inserted) {
      return NextResponse.json({ error: "This vault already has a password." }, { status: 409 });
    }

    await query("DELETE FROM vault WHERE id = 1");
    await setSessionCookie(sessionSecret);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
